package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"
)

func SendPhoneCode(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Numéro de téléphone requis"})
		return
	}

	err := services.EnvoyerCodeVerification(userID.(uint), req.Phone, "phone_verify")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Code envoyé par SMS"})
}

func VerifyPhone(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Phone string `json:"phone" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Téléphone et code requis"})
		return
	}

	if err := services.ValiderCode(userID.(uint), req.Code, "phone_verify"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	telNormalise, err := services.NormaliserTelephone(req.Phone, "FR")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	config.DB.First(&user, userID)
	config.DB.Model(&user).Updates(map[string]interface{}{
		"phone":          telNormalise,
		"phone_verified": true,
	})
	config.DB.First(&user, userID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Téléphone vérifié avec succès",
		"user":    user,
	})
}

func Toggle2FA(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paramètre 'enabled' requis"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if req.Enabled && !user.PhoneVerified {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Vous devez d'abord vérifier votre numéro de téléphone",
		})
		return
	}

	config.DB.Model(&user).Update("two_fa_enabled", req.Enabled)
	config.DB.First(&user, userID)

	message := "2FA désactivée"
	if req.Enabled {
		message = "2FA activée avec succès"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": message,
		"user":    user,
	})
}
