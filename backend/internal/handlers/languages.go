package handlers

import (
	"log"
	"net/http"
	"strings"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"

	"github.com/gin-gonic/gin"
)

func GetLanguages(c *gin.Context) {
	var languages []models.Language
	config.DB.Where("active = true").Order("created_at asc").Find(&languages)
	c.JSON(http.StatusOK, languages)
}

func GetTranslation(c *gin.Context) {
	lang := c.Param("lang")
	var translation models.Translation
	if err := config.DB.Where("lang_code = ?", lang).First(&translation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "traduction introuvable"})
		return
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(translation.Data))
}

func CreateLanguage(c *gin.Context) {
	var req struct {
		Code  string `json:"code"`
		Name  string `json:"name"`
		Label string `json:"label"`
		Flag  string `json:"flag"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code et name sont requis"})
		return
	}
	req.Code = strings.ToLower(strings.TrimSpace(req.Code))
	if req.Label == "" {
		req.Label = strings.ToUpper(req.Code)
	}

	var existing models.Language
	if err := config.DB.Unscoped().Where("code = ?", req.Code).First(&existing).Error; err == nil {
		if existing.DeletedAt.Valid {
			config.DB.Unscoped().Delete(&existing)
			config.DB.Unscoped().Where("lang_code = ?", req.Code).Delete(&models.Translation{})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": "cette langue existe déjà"})
			return
		}
	}

	var frTranslation models.Translation
	if err := config.DB.Where("lang_code = ?", "fr").First(&frTranslation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "traduction source (FR) introuvable"})
		return
	}

	translated, err := services.TranslateJSON(frTranslation.Data, req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "traduction échouée: " + err.Error()})
		return
	}

	lang := models.Language{
		Code:      req.Code,
		Name:      req.Name,
		Label:     req.Label,
		Flag:      req.Flag,
		DeepLCode: req.Code,
		Active:    true,
	}
	if err := config.DB.Create(&lang).Error; err != nil {
		log.Printf("[CreateLanguage] DB error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur création langue: " + err.Error()})
		return
	}

	if err := config.DB.Create(&models.Translation{LangCode: req.Code, Data: translated}).Error; err != nil {
		config.DB.Delete(&lang)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur sauvegarde traduction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"language": lang, "message": "Langue créée et traduite avec succès"})
}

func DeleteLanguage(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))
	if code == "fr" || code == "en" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "impossible de supprimer les langues par défaut"})
		return
	}
	config.DB.Where("code = ?", code).Delete(&models.Language{})
	config.DB.Where("lang_code = ?", code).Delete(&models.Translation{})
	c.JSON(http.StatusOK, gin.H{"message": "langue supprimée"})
}

func RetranslateLanguage(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))

	var lang models.Language
	if err := config.DB.Where("code = ?", code).First(&lang).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "langue introuvable"})
		return
	}

	var frTranslation models.Translation
	if err := config.DB.Where("lang_code = ?", "fr").First(&frTranslation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "traduction source (FR) introuvable"})
		return
	}

	translated, err := services.TranslateJSON(frTranslation.Data, lang.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "traduction échouée: " + err.Error()})
		return
	}

	config.DB.Model(&models.Translation{}).Where("lang_code = ?", code).Update("data", translated)
	c.JSON(http.StatusOK, gin.H{"message": "retraduction réussie"})
}

func GetAdminLanguages(c *gin.Context) {
	var languages []models.Language
	config.DB.Order("created_at asc").Find(&languages)
	c.JSON(http.StatusOK, languages)
}
