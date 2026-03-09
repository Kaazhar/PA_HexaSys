package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

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
	Title        string  `json:"title" binding:"required"`
	Description  string  `json:"description"`
	Date         string  `json:"date" binding:"required"`
	Duration     int     `json:"duration"`
	Location     string  `json:"location"`
	Price        float64 `json:"price"`
	MaxSpots     int     `json:"max_spots"`
	CategoryID   uint    `json:"category_id"`
	Type         string  `json:"type"`
	Image        string  `json:"image"`
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

	// Check if already booked
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
