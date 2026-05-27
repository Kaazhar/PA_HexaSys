package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"
)

func GetVapidPublicKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"public_key": services.VapidPublicKey})
}

type pushSubscribeInput struct {
	Endpoint string `json:"endpoint" binding:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

func SubscribePush(c *gin.Context) {
	userID := c.GetUint("userID")
	var input pushSubscribeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données invalides"})
		return
	}

	var existing models.PushSubscription
	result := config.DB.Where("user_id = ? AND endpoint = ?", userID, input.Endpoint).First(&existing)
	if result.Error != nil {
		sub := models.PushSubscription{
			UserID:   userID,
			Endpoint: input.Endpoint,
			P256dh:   input.Keys.P256dh,
			Auth:     input.Keys.Auth,
		}
		config.DB.Create(&sub)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Abonné aux notifications push"})
}

func UnsubscribePush(c *gin.Context) {
	userID := c.GetUint("userID")
	var input struct {
		Endpoint string `json:"endpoint" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Données invalides"})
		return
	}

	config.DB.Where("user_id = ? AND endpoint = ?", userID, input.Endpoint).Delete(&models.PushSubscription{})
	c.JSON(http.StatusOK, gin.H{"message": "Désabonné"})
}
