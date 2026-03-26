package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func CreateReport(c *gin.Context) {
	userID, _ := c.Get("userID")
	listingID, _ := strconv.Atoi(c.Param("id"))

	var listing models.Listing
	if err := config.DB.First(&listing, listingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	// Can't report your own listing
	if listing.UserID == userID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas signaler votre propre annonce"})
		return
	}

	// Check if user already reported this listing
	var existing models.Report
	if err := config.DB.Where("listing_id = ? AND user_id = ?", listingID, userID).First(&existing).Error; err == nil {
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

	report := models.Report{
		ListingID: uint(listingID),
		UserID:    userID.(uint),
		Reason:    req.Reason,
		Details:   req.Details,
	}
	if err := config.DB.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du signalement"})
		return
	}

	// Notify admins
	var admins []models.User
	config.DB.Where("role = ?", models.RoleAdmin).Find(&admins)
	for _, admin := range admins {
		notif := models.Notification{
			UserID:  admin.ID,
			Message: "Nouvelle annonce signalée : \"" + listing.Title + "\" — Raison : " + req.Reason,
			Type:    "warning",
		}
		config.DB.Create(&notif)
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Signalement envoyé"})
}

func GetReports(c *gin.Context) {
	var reports []models.Report
	query := config.DB.Preload("Listing").Preload("User")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Report{}).Count(&total)
	query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&reports)

	c.JSON(http.StatusOK, gin.H{
		"reports": reports,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func ResolveReport(c *gin.Context) {
	adminID, _ := c.Get("userID")
	id := c.Param("id")

	var report models.Report
	if err := config.DB.First(&report, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Signalement introuvable"})
		return
	}

	var req struct {
		Status    string `json:"status" binding:"required"` // resolved, dismissed
		AdminNote string `json:"admin_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	aid := adminID.(uint)
	updates := map[string]interface{}{
		"status":      req.Status,
		"admin_note":  req.AdminNote,
		"resolved_by": aid,
	}
	config.DB.Model(&report).Updates(updates)

	// If resolved → reject the listing automatically
	if req.Status == "resolved" {
		reason := "Annonce signalée et retirée suite à un signalement"
		if req.AdminNote != "" {
			reason = req.AdminNote
		}
		config.DB.Model(&models.Listing{}).Where("id = ?", report.ListingID).Updates(map[string]interface{}{
			"status":        "rejected",
			"reject_reason": reason,
		})
		// Notify listing owner
		var listing models.Listing
		config.DB.First(&listing, report.ListingID)
		notif := models.Notification{
			UserID:  listing.UserID,
			Message: "Votre annonce \"" + listing.Title + "\" a été retirée suite à un signalement.",
			Type:    "error",
		}
		config.DB.Create(&notif)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Signalement mis à jour"})
}
