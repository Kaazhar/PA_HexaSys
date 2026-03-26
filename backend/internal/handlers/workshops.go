package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

// notifyWorkshopParticipants envoie une notification à tous les inscrits d'un workshop.
func notifyWorkshopParticipants(workshopID uint, message, notifType string) {
	var bookings []models.WorkshopBooking
	config.DB.Where("workshop_id = ? AND status = ?", workshopID, "confirmed").Find(&bookings)
	for _, b := range bookings {
		config.DB.Create(&models.Notification{
			UserID:  b.UserID,
			Message: message,
			Type:    notifType,
		})
	}
}

func GetWorkshops(c *gin.Context) {
	var workshops []models.Workshop
	query := config.DB.Preload("Category").Preload("Instructor")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	} else {
		query = query.Where("status = ?", "active")
	}

	if workshopType := c.Query("type"); workshopType != "" {
		query = query.Where("type = ?", workshopType)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Workshop{}).Count(&total)

	query.Offset(offset).Limit(limit).Order("date ASC").Find(&workshops)

	c.JSON(http.StatusOK, gin.H{
		"workshops": workshops,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

func GetAdminWorkshops(c *gin.Context) {
	var workshops []models.Workshop
	query := config.DB.Preload("Category").Preload("Instructor")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Workshop{}).Count(&total)

	query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&workshops)

	c.JSON(http.StatusOK, gin.H{
		"workshops": workshops,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

func GetWorkshop(c *gin.Context) {
	id := c.Param("id")
	var workshop models.Workshop
	if err := config.DB.Preload("Category").Preload("Instructor").First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workshop not found"})
		return
	}
	c.JSON(http.StatusOK, workshop)
}

type CreateWorkshopRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Date        string  `json:"date" binding:"required"`
	Duration    int     `json:"duration"`
	Location    string  `json:"location"`
	Price       float64 `json:"price"`
	MaxSpots    int     `json:"max_spots"`
	MinSpots    int     `json:"min_spots"`
	CategoryID  uint    `json:"category_id"`
	Type        string  `json:"type"`
	Image       string  `json:"image"`
}

func CreateWorkshop(c *gin.Context) {
	var req CreateWorkshopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")

	date, err := time.Parse("2006-01-02T15:04:05Z07:00", req.Date)
	if err != nil {
		date, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}
	}

	maxSpots := req.MaxSpots
	if maxSpots == 0 {
		maxSpots = 15
	}
	minSpots := req.MinSpots
	if minSpots == 0 {
		minSpots = 10
	}

	workshopType := req.Type
	if workshopType == "" {
		workshopType = "atelier"
	}

	workshop := models.Workshop{
		Title:        req.Title,
		Description:  req.Description,
		Date:         date,
		Duration:     req.Duration,
		Location:     req.Location,
		Price:        req.Price,
		MaxSpots:     maxSpots,
		MinSpots:     minSpots,
		CategoryID:   req.CategoryID,
		Type:         workshopType,
		Image:        req.Image,
		Status:       "pending",
		InstructorID: userID.(uint),
	}

	if err := config.DB.Create(&workshop).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workshop"})
		return
	}

	config.DB.Preload("Category").Preload("Instructor").First(&workshop, workshop.ID)
	c.JSON(http.StatusCreated, workshop)
}

func UpdateWorkshop(c *gin.Context) {
	id := c.Param("id")
	var workshop models.Workshop
	if err := config.DB.First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workshop not found"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Model(&workshop).Updates(req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workshop"})
		return
	}

	config.DB.Preload("Category").Preload("Instructor").First(&workshop, id)
	c.JSON(http.StatusOK, workshop)
}

func ValidateWorkshop(c *gin.Context) {
	id := c.Param("id")
	var workshop models.Workshop
	if err := config.DB.First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workshop not found"})
		return
	}

	config.DB.Model(&workshop).Update("status", "active")

	notif := models.Notification{
		UserID:  workshop.InstructorID,
		Message: "Votre formation \"" + workshop.Title + "\" a été validée !",
		Type:    "success",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Workshop validated"})
}

func BookWorkshop(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var workshop models.Workshop
	if err := config.DB.First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workshop not found"})
		return
	}

	if workshop.Enrolled >= workshop.MaxSpots {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workshop is full"})
		return
	}

	var existing models.WorkshopBooking
	if err := config.DB.Where("workshop_id = ? AND user_id = ?", id, userID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already booked"})
		return
	}

	booking := models.WorkshopBooking{
		WorkshopID: workshop.ID,
		UserID:     userID.(uint),
		Status:     "confirmed",
	}

	if err := config.DB.Create(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to book workshop"})
		return
	}

	config.DB.Model(&workshop).UpdateColumn("enrolled", workshop.Enrolled+1)

	c.JSON(http.StatusCreated, booking)
}

type CancelWorkshopRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// CancelWorkshop annule un événement et notifie tous les inscrits.
func CancelWorkshop(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var workshop models.Workshop
	if err := config.DB.First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Événement introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && workshop.InstructorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	if workshop.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cet événement est déjà annulé"})
		return
	}

	var req CancelWorkshopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&workshop).Updates(map[string]interface{}{
		"status":        "cancelled",
		"cancel_reason": req.Reason,
	})

	msg := fmt.Sprintf("L'événement \"%s\" a été annulé. Raison : %s", workshop.Title, req.Reason)
	notifyWorkshopParticipants(workshop.ID, msg, "warning")

	if role == models.RoleAdmin && workshop.InstructorID != userID.(uint) {
		config.DB.Create(&models.Notification{
			UserID:  workshop.InstructorID,
			Message: fmt.Sprintf("Votre événement \"%s\" a été annulé par un administrateur. Raison : %s", workshop.Title, req.Reason),
			Type:    "warning",
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Événement annulé, participants notifiés"})
}

// DeleteWorkshop supprime définitivement un événement et notifie tous les inscrits.
func DeleteWorkshop(c *gin.Context) {
	id := c.Param("id")

	var workshop models.Workshop
	if err := config.DB.First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Événement introuvable"})
		return
	}

	msg := fmt.Sprintf("L'événement \"%s\" prévu le %s a été supprimé.", workshop.Title, workshop.Date.Format("02/01/2006"))
	notifyWorkshopParticipants(workshop.ID, msg, "error")

	config.DB.Create(&models.Notification{
		UserID:  workshop.InstructorID,
		Message: fmt.Sprintf("Votre événement \"%s\" a été supprimé par un administrateur.", workshop.Title),
		Type:    "error",
	})

	config.DB.Delete(&workshop)
	c.JSON(http.StatusOK, gin.H{"message": "Événement supprimé, participants notifiés"})
}

// CheckLowEnrollment annule automatiquement les événements à moins de 48h dont les inscriptions
// sont inférieures au minimum requis.
func CheckLowEnrollment(c *gin.Context) {
	deadline := time.Now().Add(48 * time.Hour)
	var workshops []models.Workshop
	config.DB.Where("status = 'active' AND date <= ? AND date > ? AND enrolled < min_spots", deadline, time.Now()).Find(&workshops)

	cancelled := 0
	for _, w := range workshops {
		reason := fmt.Sprintf("Nombre minimum de participants non atteint (%d/%d inscrits)", w.Enrolled, w.MinSpots)
		config.DB.Model(&w).Updates(map[string]interface{}{
			"status":        "cancelled",
			"cancel_reason": reason,
		})

		msg := fmt.Sprintf("L'événement \"%s\" du %s a été annulé : le nombre minimum de participants (%d) n'a pas été atteint.",
			w.Title, w.Date.Format("02/01/2006"), w.MinSpots)
		notifyWorkshopParticipants(w.ID, msg, "warning")

		config.DB.Create(&models.Notification{
			UserID:  w.InstructorID,
			Message: msg,
			Type:    "warning",
		})
		cancelled++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("%d événement(s) annulé(s) faute de participants", cancelled),
		"cancelled": cancelled,
	})
}
