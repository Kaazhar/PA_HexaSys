package handlers

import (
	"bytes"
	"fmt"
	"image/png"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetContainers(c *gin.Context) {
	var containers []models.Container
	config.DB.Order("name ASC").Find(&containers)

	// Auto-sync status from actual slot occupancy
	for i := range containers {
		var occupiedCount int64
		config.DB.Model(&models.ContainerSlot{}).
			Where("container_id = ? AND status IN ('reserved','occupied')", containers[i].ID).
			Count(&occupiedCount)
		containers[i].CurrentCount = int(occupiedCount)

		var totalSlots int64
		config.DB.Model(&models.ContainerSlot{}).
			Where("container_id = ?", containers[i].ID).
			Count(&totalSlots)

		newStatus := "operational"
		if totalSlots > 0 && occupiedCount >= totalSlots {
			newStatus = "full"
		}
		if containers[i].Status != newStatus {
			config.DB.Model(&containers[i]).Update("status", newStatus)
			containers[i].Status = newStatus
		}
	}

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

	// Slot reste "reserved" jusqu'à confirmation de dépôt par l'utilisateur

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

// ConfirmDeposit - PUT /containers/requests/:id/confirm-deposit (user auth)
// L'utilisateur confirme qu'il a déposé l'objet → slot passe de "reserved" à "occupied"
func ConfirmDeposit(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var request models.ContainerRequest
	if err := config.DB.First(&request, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Demande introuvable"})
		return
	}

	if request.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès interdit"})
		return
	}

	if request.Status != "approved" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La demande doit être approuvée avant de confirmer le dépôt"})
		return
	}

	config.DB.Model(&request).Update("status", "deposited")

	if request.SlotID != nil {
		config.DB.Model(&models.ContainerSlot{}).Where("id = ?", *request.SlotID).
			Update("status", "occupied")
	}

	config.DB.Model(&models.Container{}).Where("id = ?", request.ContainerID).
		UpdateColumn("current_count", gorm.Expr("current_count + 1"))

	config.DB.Create(&models.Notification{
		UserID:  request.UserID,
		Message: fmt.Sprintf("Dépôt confirmé pour \"%s\" — case %s.", request.ObjectTitle, request.SlotCode),
		Type:    "success",
	})

	c.JSON(http.StatusOK, gin.H{"message": "Dépôt confirmé"})
}

// Génère le code-barres (Code 128) d'une demande en image PNG, à la volée (jamais stocké).
func GenerateRequestBarcode(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	var request models.ContainerRequest
	if err := config.DB.First(&request, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Demande introuvable"})
		return
	}

	if request.UserID != userID.(uint) && role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès interdit"})
		return
	}

	if request.Barcode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aucun code-barres : la demande n'est pas encore approuvée"})
		return
	}

	encoded, err := code128.Encode(request.Barcode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le code-barres"})
		return
	}

	scaled, err := barcode.Scale(encoded, 600, 150)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le code-barres"})
		return
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, scaled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le code-barres"})
		return
	}

	c.Data(http.StatusOK, "image/png", buf.Bytes())
}

// GetMyContainerRequests - GET /containers/requests/mine (user auth)
func GetMyContainerRequests(c *gin.Context) {
	userID, _ := c.Get("userID")
	var requests []models.ContainerRequest
	config.DB.Preload("Container").Where("user_id = ?", userID).
		Order("created_at DESC").Find(&requests)
	c.JSON(http.StatusOK, requests)
}

// ClearContainerSlots - DELETE /containers/:id/slots (admin)
// Remet tous les slots à "free" et remet current_count à 0
func ClearContainerSlots(c *gin.Context) {
	id := c.Param("id")
	containerID, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid container ID"})
		return
	}

	config.DB.Model(&models.ContainerSlot{}).
		Where("container_id = ?", containerID).
		Updates(map[string]interface{}{"status": "free", "request_id": nil})

	config.DB.Model(&models.Container{}).Where("id = ?", containerID).
		Updates(map[string]interface{}{"current_count": 0, "status": "operational"})

	c.JSON(http.StatusOK, gin.H{"message": "Stock vidé"})
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

// GetAvailableObjects - GET /api/containers/available-objects
// Retourne tous les slots "occupied" avec les infos de l'objet et du conteneur (pour les pros)
func GetAvailableObjects(c *gin.Context) {
	type AvailableObject struct {
		SlotID        uint    `json:"slot_id"`
		SlotCode      string  `json:"slot_code"`
		Size          string  `json:"size"`
		ContainerID   uint    `json:"container_id"`
		ContainerName string  `json:"container_name"`
		Address       string  `json:"address"`
		District      string  `json:"district"`
		Latitude      float64 `json:"latitude"`
		Longitude     float64 `json:"longitude"`
		RequestID     uint    `json:"request_id"`
		ObjectTitle   string  `json:"object_title"`
		ObjectDesc    string  `json:"object_description"`
	}

	var slots []models.ContainerSlot
	config.DB.Where("status = 'occupied'").Find(&slots)

	result := []AvailableObject{}
	for _, slot := range slots {
		if slot.RequestID == nil {
			continue
		}
		var req models.ContainerRequest
		if err := config.DB.Preload("Container").First(&req, *slot.RequestID).Error; err != nil {
			continue
		}
		result = append(result, AvailableObject{
			SlotID:        slot.ID,
			SlotCode:      slot.SlotCode,
			Size:          slot.Size,
			ContainerID:   req.ContainerID,
			ContainerName: req.Container.Name,
			Address:       req.Container.Address,
			District:      req.Container.District,
			Latitude:      req.Container.Latitude,
			Longitude:     req.Container.Longitude,
			RequestID:     req.ID,
			ObjectTitle:   req.ObjectTitle,
			ObjectDesc:    req.ObjectDescription,
		})
	}
	c.JSON(http.StatusOK, result)
}
