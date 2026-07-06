package handlers

import (
	"net/http"
	"strings"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func ListerLangues(c *gin.Context) {
	var langues []models.Language
	config.DB.Where("active = true").Order("created_at asc").Find(&langues)
	c.JSON(http.StatusOK, langues)
}

func ObtenirTraduction(c *gin.Context) {
	code := c.Param("lang")
	var traduction models.Translation
	if err := config.DB.Where("lang_code = ?", code).First(&traduction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "traduction introuvable"})
		return
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(traduction.Data))
}

func CreerLangue(c *gin.Context) {
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

	var existante models.Language
	if err := config.DB.Unscoped().Where("code = ?", req.Code).First(&existante).Error; err == nil {
		if existante.DeletedAt.Valid {
			config.DB.Unscoped().Delete(&existante)
			config.DB.Unscoped().Where("lang_code = ?", req.Code).Delete(&models.Translation{})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": "cette langue existe déjà"})
			return
		}
	}

	nouvelle := models.Language{
		Code:      req.Code,
		Name:      req.Name,
		Label:     req.Label,
		Flag:      req.Flag,
		DeepLCode: req.Code,
		Active:    true,
	}
	if err := config.DB.Create(&nouvelle).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur création langue: " + err.Error()})
		return
	}

	var traductionFR models.Translation
	if config.DB.Where("lang_code = ?", "fr").First(&traductionFR).Error == nil {
		config.DB.Create(&models.Translation{LangCode: req.Code, Data: traductionFR.Data})
	}

	c.JSON(http.StatusCreated, gin.H{"language": nouvelle, "message": "Langue créée avec succès"})
}

func SupprimerLangue(c *gin.Context) {
	code := strings.ToLower(c.Param("code"))
	if code == "fr" || code == "en" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "impossible de supprimer les langues par défaut"})
		return
	}
	config.DB.Where("code = ?", code).Delete(&models.Language{})
	config.DB.Where("lang_code = ?", code).Delete(&models.Translation{})
	c.JSON(http.StatusOK, gin.H{"message": "langue supprimée"})
}

func ListerLanguesAdmin(c *gin.Context) {
	var langues []models.Language
	config.DB.Order("created_at asc").Find(&langues)
	c.JSON(http.StatusOK, langues)
}
