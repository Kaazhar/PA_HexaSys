package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetContainers(c *gin.Context) {
	var containers []models.Container
	config.DB.Order("name ASC").Find(&containers)
	c.JSON(http.StatusOK, containers)
}

func GetContainer(c *gin.Context) {
	id := c.Param("id")
	var container models.Container
	if err := config.DB.First(&container, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Container not found"})
		return
	}
	c.JSON(http.StatusOK, container)
}

type CreateContainerRequest struct {
	Name      string  `json:"name" binding:"required"`
	Address   string  `json:"address"`
	District  string  `json:"district"`
	Capacity  int     `json:"capacity"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func CreateContainer(c *gin.Context) {
	var req CreateContainerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	capacity := req.Capacity
	if capacity == 0 {
		capacity = 25
	}

	container := models.Container{
		Name:      req.Name,
		Address:   req.Address,
		District:  req.District,
		Capacity:  capacity,
		Status:    "operational",
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}

	if err := config.DB.Create(&container).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create container"})
		return
	}

	c.JSON(http.StatusCreated, container)
}

func UpdateContainer(c *gin.Context) {
	id := c.Param("id")
	var container models.Container
	if err := config.DB.First(&container, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Container not found"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&container).Updates(req)
	config.DB.First(&container, id)
	c.JSON(http.StatusOK, container)
}

// GetContainerSlots - GET /api/containers/slots?container_id=X
func GetContainerSlots(c *gin.Context) {
	containerID := c.Query("container_id")
	if containerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container_id requis"})
		return
	}
	var slots []models.ContainerSlot
	config.DB.Where("container_id = ?", containerID).Order("size ASC, slot_code ASC").Find(&slots)
	c.JSON(http.StatusOK, slots)
}

// SeedContainerSlots - POST /api/containers/:id/slots (admin)
// Body: { "S": 6, "M": 4, "L": 2 }
func SeedContainerSlots(c *gin.Context) {
	id := c.Param("id")
	containerID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid container ID"})
		return
	}

	var req map[string]int
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, size := range []string{"S", "M", "L"} {
		count := req[size]
		if count <= 0 {
			continue
		}
		var existing int64
		config.DB.Model(&models.ContainerSlot{}).
			Where("container_id = ? AND size = ?", containerID, size).
			Count(&existing)
		for i := 1; i <= count; i++ {
			slotCode := fmt.Sprintf("%s-%02d", size, int(existing)+i)
			config.DB.Create(&models.ContainerSlot{
				ContainerID: uint(containerID),
				SlotCode:    slotCode,
				Size:        size,
				Status:      "free",
			})
		}
	}

	var slots []models.ContainerSlot
	config.DB.Where("container_id = ?", containerID).Order("size ASC, slot_code ASC").Find(&slots)
	c.JSON(http.StatusCreated, slots)
}

func GetContainerRequests(c *gin.Context) {
	var requests []models.ContainerRequest
	query := config.DB.Preload("User").Preload("Container")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("created_at DESC").Find(&requests)
	c.JSON(http.StatusOK, requests)
}

type ContainerRequestBody struct {
	ContainerID       uint   `json:"container_id" binding:"required"`
	ObjectTitle       string `json:"object_title" binding:"required"`
	ObjectDescription string `json:"object_description"`
	DesiredDate       string `json:"desired_date" binding:"required"`
	SizeCategory      string `json:"size_category" binding:"required"`
	SlotID            uint   `json:"slot_id"`
}

func CreateContainerRequestHandler(c *gin.Context) {
	var req ContainerRequestBody
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")

	date, err := time.Parse("2006-01-02", req.DesiredDate)
	if err != nil {
		date = time.Now().Add(7 * 24 * time.Hour)
	}

	request := models.ContainerRequest{
		UserID:            userID.(uint),
		ContainerID:       req.ContainerID,
		ObjectTitle:       req.ObjectTitle,
		ObjectDescription: req.ObjectDescription,
		DesiredDate:       date,
		SizeCategory:      req.SizeCategory,
		Status:            "pending",
	}

	// If a slot was selected, reserve it atomically
	if req.SlotID > 0 {
		txErr := config.DB.Transaction(func(tx *gorm.DB) error {
			var slot models.ContainerSlot
			if err := tx.Where("id = ? AND container_id = ? AND size = ? AND status = 'free'",
				req.SlotID, req.ContainerID, req.SizeCategory).First(&slot).Error; err != nil {
				return fmt.Errorf("slot indisponible")
			}
			request.SlotID = &slot.ID
			request.SlotCode = slot.SlotCode
			if err := tx.Create(&request).Error; err != nil {
				return err
			}
			return tx.Model(&slot).Updates(map[string]interface{}{
				"status":     "reserved",
				"request_id": request.ID,
			}).Error
		})
		if txErr != nil {
			c.JSON(http.StatusConflict, gin.H{"error": txErr.Error()})
			return
		}
	} else {
		if err := config.DB.Create(&request).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}
	}

	config.DB.Preload("User").Preload("Container").First(&request, request.ID)
	c.JSON(http.StatusCreated, request)
}

func ValidateContainerRequest(c *gin.Context) {
	id := c.Param("id")
	var request models.ContainerRequest
	if err := config.DB.Preload("Container").First(&request, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	accessCode := fmt.Sprintf("%06d", rand.Intn(1000000))
	barcode := fmt.Sprintf("UC%010d", rand.Intn(10000000000))

	config.DB.Model(&request).Updates(map[string]interface{}{
		"status":      "approved",
		"access_code": accessCode,
		"barcode":     barcode,
	})

	// Mark slot as occupied
	if request.SlotID != nil {
		config.DB.Model(&models.ContainerSlot{}).Where("id = ?", *request.SlotID).
			Update("status", "occupied")
	}

	config.DB.Model(&models.Container{}).Where("id = ?", request.ContainerID).
		UpdateColumn("current_count", gorm.Expr("current_count + 1"))

	notif := models.Notification{
		UserID:  request.UserID,
		Message: fmt.Sprintf("Votre demande de dépôt a été approuvée ! Code d'accès : %s — Case : %s", accessCode, request.SlotCode),
		Type:    "success",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Request approved", "access_code": accessCode, "barcode": barcode})
}

func RejectContainerRequest(c *gin.Context) {
	id := c.Param("id")
	var request models.ContainerRequest
	if err := config.DB.First(&request, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	var req RejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&request).Updates(map[string]interface{}{
		"status":        "rejected",
		"reject_reason": req.Reason,
	})

	// Free the slot
	if request.SlotID != nil {
		config.DB.Model(&models.ContainerSlot{}).Where("id = ?", *request.SlotID).
			Updates(map[string]interface{}{"status": "free", "request_id": nil})
	}

	notif := models.Notification{
		UserID:  request.UserID,
		Message: "Votre demande de dépôt a été refusée : " + req.Reason,
		Type:    "error",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Request rejected"})
}
