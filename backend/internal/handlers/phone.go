package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"
)

func EnvoyerCodeTelephone(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Numéro de téléphone requis"})
		return
	}

	if err := services.EnvoyerCodeVerification(idUtilisateur.(uint), req.Phone, "phone_verify"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Code envoyé par SMS"})
}

func VerifierTelephone(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		Phone string `json:"phone" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Téléphone et code requis"})
		return
	}

	if err := services.ValiderCode(idUtilisateur.(uint), req.Code, "phone_verify"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	telNormalise, err := services.NormaliserTelephone(req.Phone, "FR")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)
	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"phone":          telNormalise,
		"phone_verified": true,
	})
	config.DB.First(&utilisateur, idUtilisateur)

	c.JSON(http.StatusOK, gin.H{
		"message": "Téléphone vérifié avec succès",
		"user":    utilisateur,
	})
}

func BasculerSMS2FA(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paramètre 'enabled' requis"})
		return
	}

	var utilisateur models.User
	if err := config.DB.First(&utilisateur, idUtilisateur).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if req.Enabled && !utilisateur.PhoneVerified {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Vous devez d'abord vérifier votre numéro de téléphone",
		})
		return
	}

	config.DB.Model(&utilisateur).Update("two_fa_enabled", req.Enabled)
	config.DB.First(&utilisateur, idUtilisateur)

	msg := "2FA désactivée"
	if req.Enabled {
		msg = "2FA activée avec succès"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": msg,
		"user":    utilisateur,
	})
}
