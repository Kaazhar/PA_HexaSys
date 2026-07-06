package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"
)

func CleVapidPublique(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"public_key": services.VapidPublicKey})
}

type donneesAbonnementPush struct {
	Endpoint string `json:"endpoint" binding:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

func AbonnerPush(c *gin.Context) {
	idUtilisateur := c.GetUint("userID")
	var donnees donneesAbonnementPush
	if err := c.ShouldBindJSON(&donnees); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données invalides"})
		return
	}

	var existant models.PushSubscription
	res := config.DB.Where("user_id = ? AND endpoint = ?", idUtilisateur, donnees.Endpoint).First(&existant)
	if res.Error != nil {
		abonnement := models.PushSubscription{
			UserID:   idUtilisateur,
			Endpoint: donnees.Endpoint,
			P256dh:   donnees.Keys.P256dh,
			Auth:     donnees.Keys.Auth,
		}
		config.DB.Create(&abonnement)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Abonné aux notifications push"})
}

func DesabonnerPush(c *gin.Context) {
	idUtilisateur := c.GetUint("userID")
	var donnees struct {
		Endpoint string `json:"endpoint" binding:"required"`
	}
	if err := c.ShouldBindJSON(&donnees); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données invalides"})
		return
	}

	config.DB.Where("user_id = ? AND endpoint = ?", idUtilisateur, donnees.Endpoint).Delete(&models.PushSubscription{})
	c.JSON(http.StatusOK, gin.H{"message": "Désabonné"})
}
