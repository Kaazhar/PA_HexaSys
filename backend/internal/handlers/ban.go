package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

type RequeteBan struct {
	Reason      string `json:"reason" binding:"required"`
	Duration    int    `json:"duration"`
	IsPermanent bool   `json:"is_permanent"`
}

func BannirUtilisateur(c *gin.Context) {
	id := c.Param("id")
	idAdmin, _ := c.Get("userID")

	var utilisateur models.User
	if err := config.DB.First(&utilisateur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	var req RequeteBan
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var expiration *time.Time
	definitif := req.IsPermanent
	if req.Duration == 0 {
		definitif = true
	}
	if !definitif && req.Duration > 0 {
		t := time.Now().AddDate(0, 0, req.Duration)
		expiration = &t
	}

	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"is_banned":      true,
		"ban_reason":     req.Reason,
		"ban_expires_at": expiration,
	})

	enregistrementBan := models.BanRecord{
		UserID:      utilisateur.ID,
		AdminID:     idAdmin.(uint),
		Reason:      req.Reason,
		ExpiresAt:   expiration,
		IsPermanent: definitif,
		IsActive:    true,
	}
	config.DB.Create(&enregistrementBan)

	dureeMsg := "définitivement"
	if expiration != nil {
		dureeMsg = fmt.Sprintf("jusqu'au %s", expiration.Format("02/01/2006"))
	}
	config.DB.Create(&models.Notification{
		UserID:  utilisateur.ID,
		Message: fmt.Sprintf("Votre compte a été banni %s. Raison : %s", dureeMsg, req.Reason),
		Type:    "error",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Utilisateur banni", "ban": enregistrementBan})
}

func LeverBan(c *gin.Context) {
	id := c.Param("id")

	var utilisateur models.User
	if err := config.DB.First(&utilisateur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if !utilisateur.IsBanned {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cet utilisateur n'est pas banni"})
		return
	}

	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"is_banned":      false,
		"ban_reason":     "",
		"ban_expires_at": nil,
	})
	config.DB.Model(&models.BanRecord{}).Where("user_id = ? AND is_active = ?", id, true).Update("is_active", false)

	config.DB.Create(&models.Notification{
		UserID:  utilisateur.ID,
		Message: "Votre bannissement a été levé. Vous pouvez de nouveau accéder à votre compte.",
		Type:    "success",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Utilisateur débanni"})
}

func HistoriqueBans(c *gin.Context) {
	id := c.Param("id")
	var bans []models.BanRecord
	config.DB.Preload("Admin").Where("user_id = ?", id).Order("created_at DESC").Find(&bans)
	c.JSON(http.StatusOK, bans)
}
