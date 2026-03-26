package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

type BanRequest struct {
	Reason      string `json:"reason" binding:"required"`
	Duration    int    `json:"duration"`     // jours, 0 = permanent
	IsPermanent bool   `json:"is_permanent"` // forcer permanent
}

func BanUser(c *gin.Context) {
	id := c.Param("id")
	adminID, _ := c.Get("userID")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	var req BanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var expiresAt *time.Time
	isPermanent := req.IsPermanent || req.Duration == 0
	if !isPermanent && req.Duration > 0 {
		t := time.Now().AddDate(0, 0, req.Duration)
		expiresAt = &t
	}

	config.DB.Model(&user).Updates(map[string]interface{}{
		"is_banned":      true,
		"ban_reason":     req.Reason,
		"ban_expires_at": expiresAt,
	})

	banRecord := models.BanRecord{
		UserID:      user.ID,
		AdminID:     adminID.(uint),
		Reason:      req.Reason,
		ExpiresAt:   expiresAt,
		IsPermanent: isPermanent,
		IsActive:    true,
	}
	config.DB.Create(&banRecord)

	durationMsg := "définitivement"
	if expiresAt != nil {
		durationMsg = fmt.Sprintf("jusqu'au %s", expiresAt.Format("02/01/2006"))
	}
	config.DB.Create(&models.Notification{
		UserID:  user.ID,
		Message: fmt.Sprintf("Votre compte a été banni %s. Raison : %s", durationMsg, req.Reason),
		Type:    "error",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Utilisateur banni", "ban": banRecord})
}

func UnbanUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if !user.IsBanned {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cet utilisateur n'est pas banni"})
		return
	}

	config.DB.Model(&user).Updates(map[string]interface{}{
		"is_banned":      false,
		"ban_reason":     "",
		"ban_expires_at": nil,
	})
	config.DB.Model(&models.BanRecord{}).Where("user_id = ? AND is_active = ?", id, true).Update("is_active", false)

	config.DB.Create(&models.Notification{
		UserID:  user.ID,
		Message: "Votre bannissement a été levé. Vous pouvez de nouveau accéder à votre compte.",
		Type:    "success",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Utilisateur débanni"})
}

func GetBanHistory(c *gin.Context) {
	id := c.Param("id")
	var bans []models.BanRecord
	config.DB.Preload("Admin").Where("user_id = ?", id).Order("created_at DESC").Find(&bans)
	c.JSON(http.StatusOK, bans)
}
