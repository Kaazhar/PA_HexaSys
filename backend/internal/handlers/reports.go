package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func SignalerAnnonce(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	idAnnonce, _ := strconv.Atoi(c.Param("id"))

	var annonce models.Listing
	if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	if annonce.UserID == idUtilisateur.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas signaler votre propre annonce"})
		return
	}

	var existant models.Report
	if err := config.DB.Where("listing_id = ? AND user_id = ?", idAnnonce, idUtilisateur).First(&existant).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Vous avez déjà signalé cette annonce"})
		return
	}

	var req struct {
		Reason  string `json:"reason" binding:"required"`
		Details string `json:"details"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	signalement := models.Report{
		ListingID: uint(idAnnonce),
		UserID:    idUtilisateur.(uint),
		Reason:    req.Reason,
		Details:   req.Details,
	}
	if err := config.DB.Create(&signalement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du signalement"})
		return
	}

	var admins []models.User
	config.DB.Where("role = ?", models.RoleAdmin).Find(&admins)
	for _, admin := range admins {
		config.DB.Create(&models.Notification{
			UserID:  admin.ID,
			Message: "Nouvelle annonce signalée : \"" + annonce.Title + "\" — Raison : " + req.Reason,
			Type:    "warning",
		})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Signalement envoyé"})
}

func ListerSignalements(c *gin.Context) {
	var signalements []models.Report
	q := config.DB.Preload("Listing").Preload("User")

	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var total int64
	q.Model(&models.Report{}).Count(&total)
	q.Offset(decalage).Limit(limite).Order("created_at DESC").Find(&signalements)

	c.JSON(http.StatusOK, gin.H{
		"reports": signalements,
		"total":   total,
		"page":    page,
		"limit":   limite,
	})
}

func TraiterSignalement(c *gin.Context) {
	idAdmin, _ := c.Get("userID")
	id := c.Param("id")

	var signalement models.Report
	if err := config.DB.First(&signalement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Signalement introuvable"})
		return
	}

	var req struct {
		Status    string `json:"status" binding:"required"`
		AdminNote string `json:"admin_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status != "resolved" && req.Status != "dismissed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Statut invalide, valeurs acceptées : resolved, dismissed"})
		return
	}

	modifications := map[string]interface{}{
		"status":      req.Status,
		"admin_note":  req.AdminNote,
		"resolved_by": idAdmin.(uint),
	}
	config.DB.Model(&signalement).Updates(modifications)

	if req.Status == "resolved" {
		raison := "Annonce signalée et retirée suite à un signalement"
		if req.AdminNote != "" {
			raison = req.AdminNote
		}
		config.DB.Model(&models.Listing{}).Where("id = ?", signalement.ListingID).Updates(map[string]interface{}{
			"status":        "rejected",
			"reject_reason": raison,
		})
		var annonce models.Listing
		config.DB.First(&annonce, signalement.ListingID)
		config.DB.Create(&models.Notification{
			UserID:  annonce.UserID,
			Message: "Votre annonce \"" + annonce.Title + "\" a été retirée suite à un signalement.",
			Type:    "error",
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Signalement mis à jour"})
}
