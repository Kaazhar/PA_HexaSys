package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetListings(c *gin.Context) {
	config.DB.Model(&models.Listing{}).Where("is_sponsored = true AND sponsored_until < ?", time.Now()).Updates(map[string]interface{}{"is_sponsored": false, "sponsored_until": nil})

	var listings []models.Listing
	query := config.DB.Preload("Category").Preload("User")

	role, _ := c.Get("userRole")
	userRole, _ := role.(models.UserRole)
	if userRole != models.RoleAdmin {
		if status := c.Query("status"); status != "" {
			query = query.Where("status = ?", status)
		} else {
			query = query.Where("status = ?", "active")
		}
	} else {
		if status := c.Query("status"); status != "" {
			query = query.Where("status = ?", status)
		}
	}

	if category := c.Query("category"); category != "" {
		query = query.Where("category_id = ?", category)
	}
	if listingType := c.Query("type"); listingType != "" {
		query = query.Where("type = ?", listingType)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if location := c.Query("location"); location != "" {
		query = query.Where("location LIKE ?", "%"+location+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Listing{}).Count(&total)

	query.Offset(offset).Limit(limit).Order("is_sponsored DESC, created_at DESC").Find(&listings)

	c.JSON(http.StatusOK, gin.H{
		"listings": listings,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func GetListing(c *gin.Context) {
	id := c.Param("id")
	var listing models.Listing
	if err := config.DB.Preload("Category").Preload("User").First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Listing not found"})
		return
	}
	c.JSON(http.StatusOK, listing)
}

type CreateListingRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Type        string  `json:"type" binding:"required"`
	CategoryID  uint    `json:"category_id"`
	Condition   string  `json:"condition"`
	Price       float64 `json:"price"`
	Location    string  `json:"location"`
	Images      string  `json:"images"`
}

func CreateListing(c *gin.Context) {
	var req CreateListingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if interdit, mot := services.ContientMotInterdit(req.Title, req.Description); interdit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Votre annonce contient un terme interdit : '" + mot + "'. Merci de le retirer."})
		return
	}

	userID, _ := c.Get("userID")

	var activeCount int64
	config.DB.Model(&models.Listing{}).Where("user_id = ? AND status IN ('active', 'pending')", userID).Count(&activeCount)
	limit := GetUserListingLimit(userID.(uint))
	if int(activeCount) >= limit {
		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Limite d'annonces atteinte (%d/%d). Souscrivez un abonnement pour publier plus d'annonces.", activeCount, limit)})
		return
	}

	listing := models.Listing{
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		CategoryID:  req.CategoryID,
		Condition:   req.Condition,
		Price:       req.Price,
		Location:    req.Location,
		Images:      req.Images,
		Status:      "pending",
		UserID:      userID.(uint),
	}

	if err := config.DB.Create(&listing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create listing"})
		return
	}

	scoreEntry := models.ScoreEntry{
		UserID: userID.(uint),
		Points: 10,
		Reason: "Annonce créée",
		Action: "listing_created",
	}
	config.DB.Create(&scoreEntry)
	wasteKg := listing.Weight
	if wasteKg <= 0 {
		wasteKg = 1.0
	}
	config.DB.Model(&models.UpcyclingScore{}).Where("user_id = ?", userID).Updates(map[string]interface{}{
		"total_points":       gorm.Expr("total_points + ?", 10),
		"waste_avoided_kg":   gorm.Expr("waste_avoided_kg + ?", wasteKg),
		"co2_saved_kg":       gorm.Expr("co2_saved_kg + ?", wasteKg*2.5),
		"water_saved_liters": gorm.Expr("water_saved_liters + ?", wasteKg*50),
	})

	config.DB.Preload("Category").Preload("User").First(&listing, listing.ID)
	c.JSON(http.StatusCreated, listing)
}

func ValidateListing(c *gin.Context) {
	id := c.Param("id")
	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Listing not found"})
		return
	}

	config.DB.Model(&listing).Updates(map[string]interface{}{
		"status":        "active",
		"reject_reason": "",
	})

	notif := models.Notification{
		UserID:  listing.UserID,
		Message: "Votre annonce \"" + listing.Title + "\" a été validée !",
		Type:    "success",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Listing validated", "listing": listing})
}

type RejectRequest struct {
	Reason string `json:"reason" binding:"required"`
}

func RejectListing(c *gin.Context) {
	id := c.Param("id")
	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Listing not found"})
		return
	}

	var req RejectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&listing).Updates(map[string]interface{}{
		"status":        "rejected",
		"reject_reason": req.Reason,
	})

	notif := models.Notification{
		UserID:  listing.UserID,
		Message: "Votre annonce \"" + listing.Title + "\" a été rejetée : " + req.Reason,
		Type:    "error",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Listing rejected"})
}

func GetMyListings(c *gin.Context) {
	userID, _ := c.Get("userID")
	var listings []models.Listing
	query := config.DB.Preload("Category").Where("user_id = ?", userID)
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit
	var total int64
	query.Model(&models.Listing{}).Count(&total)
	query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&listings)
	c.JSON(http.StatusOK, gin.H{"listings": listings, "total": total, "page": page, "limit": limit})
}

func MarkListingSold(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	if listing.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	commission := listing.Price * (listing.CommissionRate / 100)
	config.DB.Model(&listing).Updates(map[string]interface{}{
		"status":            "sold",
		"commission_amount": commission,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Annonce marquée comme vendue", "commission": commission})
}

func DeleteListing(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && listing.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&listing)
	c.JSON(http.StatusOK, gin.H{"message": "Annonce supprimée"})
}

func GetAdminListings(c *gin.Context) {
	var listings []models.Listing
	query := config.DB.Preload("Category").Preload("User")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Listing{}).Count(&total)

	query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&listings)

	c.JSON(http.StatusOK, gin.H{
		"listings": listings,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func UpdateListing(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	if listing.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req CreateListingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if interdit, mot := services.ContientMotInterdit(req.Title, req.Description); interdit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Votre annonce contient un terme interdit : '" + mot + "'. Merci de le retirer."})
		return
	}

	config.DB.Model(&listing).Updates(map[string]interface{}{
		"title":       req.Title,
		"description": req.Description,
		"type":        req.Type,
		"category_id": req.CategoryID,
		"condition":   req.Condition,
		"price":       req.Price,
		"location":    req.Location,
		"images":      req.Images,
		"status":      "pending",
	})

	config.DB.Preload("Category").Preload("User").First(&listing, listing.ID)
	c.JSON(http.StatusOK, listing)
}

func BoostListing(c *gin.Context) {
	userID, _ := c.Get("userID")
	id := c.Param("id")

	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	if listing.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}
	if listing.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "L'annonce doit être active pour être boostée"})
		return
	}
	if listing.IsSponsored && listing.SponsoredUntil != nil && listing.SponsoredUntil.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette annonce est déjà boostée"})
		return
	}

	var user models.User
	config.DB.First(&user, userID)

	if !user.HasUsedFreeBoost {
		until := time.Now().Add(24 * time.Hour)
		config.DB.Model(&listing).Updates(map[string]interface{}{
			"is_sponsored":    true,
			"sponsored_until": until,
		})
		config.DB.Model(&user).Update("has_used_free_boost", true)
		c.JSON(http.StatusOK, gin.H{"free": true, "sponsored_until": until})
		return
	}

	checkoutURL, err := createBoostCheckoutSession(listing.ID, userID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"checkout_url": checkoutURL})
}

func SponsorListing(c *gin.Context) {
	id := c.Param("id")
	var listing models.Listing
	if err := config.DB.First(&listing, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	var req struct {
		IsSponsored bool `json:"is_sponsored"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&listing).Update("is_sponsored", req.IsSponsored)
	c.JSON(http.StatusOK, gin.H{"is_sponsored": req.IsSponsored})
}
