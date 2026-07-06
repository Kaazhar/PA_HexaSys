package handlers

import (
	"net/http"

	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func BasculerNewsletter(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req struct {
		Subscribed bool `json:"subscribed"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&models.User{}).Where("id = ?", idUtilisateur).Update("newsletter_subscribed", req.Subscribed)
	msg := "Désinscrit de la newsletter"
	if req.Subscribed {
		msg = "Inscrit à la newsletter"
	}
	c.JSON(http.StatusOK, gin.H{"message": msg})
}

func EnvoyerNewsletter(c *gin.Context) {
	var req struct {
		Subject string `json:"subject" binding:"required"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var utilisateurs []models.User
	config.DB.Where("newsletter_subscribed = ? AND is_active = ?", true, true).Find(&utilisateurs)

	if len(utilisateurs) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Aucun abonné", "sent": 0})
		return
	}

	corps := emailNewsletterTemplate(req.Subject, req.Content)
	envoyes := 0
	for _, u := range utilisateurs {
		if err := config.SendEmail(u.Email, req.Subject+" - UpcycleConnect", corps); err == nil {
			envoyes++
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Newsletter envoyée", "sent": envoyes, "total": len(utilisateurs)})
}
