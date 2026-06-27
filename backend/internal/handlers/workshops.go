package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

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
	if err := config.DB.
		Preload("Category").
		Preload("Instructor").
		Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC, date ASC") }).
		Preload("Chapters", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC") }).
		First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workshop not found"})
		return
	}
	c.JSON(http.StatusOK, workshop)
}

type SessionInput struct {
	Date     string `json:"date"`
	Duration int    `json:"duration"`
}

type ChapterInput struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type CreateWorkshopRequest struct {
	Title       string         `json:"title" binding:"required"`
	Description string         `json:"description"`
	Objective   string         `json:"objective"`
	Date        string         `json:"date"`
	Duration    int            `json:"duration"`
	Location    string         `json:"location"`
	Price       float64        `json:"price"`
	MaxSpots    int            `json:"max_spots"`
	MinSpots    int            `json:"min_spots"`
	CategoryID  uint           `json:"category_id"`
	Type        string         `json:"type"`
	Image       string         `json:"image"`
	Sessions    []SessionInput `json:"sessions"`
	Chapters    []ChapterInput `json:"chapters"`
}

// parseWorkshopDate accepte plusieurs formats (RFC3339, datetime-local, date seule).
func parseWorkshopDate(s string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02T15:04:05Z07:00", s); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02T15:04", s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}

func CreateWorkshop(c *gin.Context) {
	var req CreateWorkshopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")

	// Parse les séances (si fournies), triées par date.
	var sessions []models.WorkshopSession
	for _, s := range req.Sessions {
		if s.Date == "" {
			continue
		}
		d, err := parseWorkshopDate(s.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session date format"})
			return
		}
		sessions = append(sessions, models.WorkshopSession{Date: d, Duration: s.Duration})
	}
	sort.Slice(sessions, func(i, j int) bool { return sessions[i].Date.Before(sessions[j].Date) })

	// Date/durée principales : 1ère séance si dispo, sinon champs hérités.
	var date time.Time
	duration := req.Duration
	if len(sessions) > 0 {
		date = sessions[0].Date
		duration = sessions[0].Duration
	} else {
		d, err := parseWorkshopDate(req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}
		date = d
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
		Objective:    req.Objective,
		Date:         date,
		Duration:     duration,
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

	// Séances rattachées (Order = position chronologique).
	for i := range sessions {
		sessions[i].WorkshopID = workshop.ID
		sessions[i].Order = i
	}
	if len(sessions) > 0 {
		config.DB.Create(&sessions)
	}

	// Chapitres rattachés (Order = position dans le formulaire).
	for i, ch := range req.Chapters {
		if ch.Title == "" && ch.Content == "" {
			continue
		}
		config.DB.Create(&models.WorkshopChapter{
			WorkshopID: workshop.ID,
			Title:      ch.Title,
			Content:    ch.Content,
			Order:      i,
		})
	}

	config.DB.
		Preload("Category").
		Preload("Instructor").
		Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC, date ASC") }).
		Preload("Chapters", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC") }).
		First(&workshop, workshop.ID)
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

	if workshop.Price > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette formation est payante, veuillez passer par le paiement"})
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

	config.DB.Model(&workshop).UpdateColumn("enrolled", gorm.Expr("enrolled + 1"))

	c.JSON(http.StatusCreated, booking)
}

type CancelWorkshopRequest struct {
	Reason string `json:"reason" binding:"required"`
}

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

// GetWorkshopBookings renvoie la liste des inscrits d'une formation.
// Réservé à l'instructeur propriétaire ou à un admin. N'expose pas l'email.
func GetWorkshopBookings(c *gin.Context) {
	id := c.Param("id")
	var workshop models.Workshop
	if err := config.DB.First(&workshop, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workshop not found"})
		return
	}

	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	role, _ := userRole.(models.UserRole)
	if role != models.RoleAdmin && workshop.InstructorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}

	var bookings []models.WorkshopBooking
	config.DB.Preload("User").
		Where("workshop_id = ? AND status = ?", workshop.ID, "confirmed").
		Order("created_at ASC").Find(&bookings)

	type participant struct {
		Firstname string `json:"firstname"`
		Lastname  string `json:"lastname"`
		BookedAt  string `json:"booked_at"`
	}
	participants := make([]participant, 0, len(bookings))
	for _, b := range bookings {
		participants = append(participants, participant{
			Firstname: b.User.Firstname,
			Lastname:  b.User.Lastname,
			BookedAt:  b.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"participants": participants,
		"count":        len(participants),
		"max_spots":    workshop.MaxSpots,
	})
}

func GetMyBookings(c *gin.Context) {
	userID, _ := c.Get("userID")
	var bookings []models.WorkshopBooking
	config.DB.Preload("Workshop").Preload("Workshop.Category").
		Where("user_id = ? AND status = ?", userID, "confirmed").
		Order("created_at DESC").Find(&bookings)
	c.JSON(http.StatusOK, bookings)
}

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
