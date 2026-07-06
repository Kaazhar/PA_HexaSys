package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func AvisAnnonce(c *gin.Context) {
	id := c.Param("id")
	var avis []models.Review
	config.DB.Preload("Reviewer").Where("listing_id = ?", id).Order("created_at DESC").Find(&avis)
	c.JSON(http.StatusOK, avis)
}

func AvisUtilisateur(c *gin.Context) {
	id := c.Param("id")
	var avis []models.Review
	config.DB.Preload("Reviewer").Preload("Listing").Where("target_user_id = ?", id).Order("created_at DESC").Find(&avis)

	var moyenne float64
	var nbAvis int64
	config.DB.Model(&models.Review{}).Where("target_user_id = ?", id).Count(&nbAvis)
	if nbAvis > 0 {
		config.DB.Model(&models.Review{}).Where("target_user_id = ?", id).
			Select("AVG(rating)").Scan(&moyenne)
	}

	c.JSON(http.StatusOK, gin.H{
		"reviews": avis,
		"average": moyenne,
		"count":   nbAvis,
	})
}

func CreerAvis(c *gin.Context) {
	idAnnonce, _ := strconv.Atoi(c.Param("id"))
	idEvaluateur, _ := c.Get("userID")

	var annonce models.Listing
	if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	if annonce.UserID == idEvaluateur.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas noter votre propre annonce"})
		return
	}

	var existant models.Review
	if err := config.DB.Where("listing_id = ? AND reviewer_id = ?", idAnnonce, idEvaluateur).First(&existant).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Vous avez déjà noté cette annonce"})
		return
	}

	var req struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	avis := models.Review{
		ReviewerID:   idEvaluateur.(uint),
		TargetUserID: annonce.UserID,
		ListingID:    uint(idAnnonce),
		Rating:       req.Rating,
		Comment:      req.Comment,
	}
	config.DB.Create(&avis)
	config.DB.Preload("Reviewer").First(&avis, avis.ID)
	c.JSON(http.StatusCreated, avis)
}

func SupprimerAvis(c *gin.Context) {
	id := c.Param("id")
	idEvaluateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var avis models.Review
	if err := config.DB.First(&avis, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Avis introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && avis.ReviewerID != idEvaluateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&avis)
	c.JSON(http.StatusOK, gin.H{"message": "Avis supprimé"})
}
