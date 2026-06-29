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

const BaseListingLimit = 5

func planLabel(plan string) string {
	var p models.SubscriptionPlan
	if err := config.DB.Where("slug = ?", plan).First(&p).Error; err == nil {
		return p.Name
	}
	return plan
}

func GetUserListingLimit(userID uint) int {
	var subs []models.Subscription
	now := time.Now()
	config.DB.Where("user_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)", userID, now).Find(&subs)
	total := BaseListingLimit
	for _, s := range subs {
		total += s.MaxListingsBonus
	}
	return total
}

func GetSubscriptionPlans(c *gin.Context) {
	var plans []models.SubscriptionPlan
	config.DB.Where("is_active = true").Order("sort_order ASC, price ASC").Find(&plans)
	c.JSON(http.StatusOK, plans)
}

func GetMySubscriptions(c *gin.Context) {
	userID, _ := c.Get("userID")
	now := time.Now()
	soon := now.Add(3 * 24 * time.Hour)

	var subs []models.Subscription
	config.DB.Where("user_id = ? AND status = 'active'", userID).Order("expires_at ASC").Find(&subs)

	for i := range subs {
		if subs[i].ExpiresAt != nil && subs[i].ExpiresAt.Before(soon) && !subs[i].NotifiedExpiry {
			days := int(time.Until(*subs[i].ExpiresAt).Hours() / 24)
			msg := fmt.Sprintf("⏰ Votre abonnement \"%s\" expire dans %d jour(s). Renouvelez-le pour conserver vos avantages.", subs[i].Plan, days)
			config.DB.Create(&models.Notification{UserID: userID.(uint), Message: msg, Type: "warning"})
			config.DB.Model(&subs[i]).Update("notified_expiry", true)
		}
	}

	limit := GetUserListingLimit(userID.(uint))
	c.JSON(http.StatusOK, gin.H{"subscriptions": subs, "listing_limit": limit, "base_limit": BaseListingLimit})
}

func SubscribeToFreePlan(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Slug string `json:"slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var plan models.SubscriptionPlan
	if err := config.DB.Where("slug = ? AND is_active = true AND price = 0", req.Slug).First(&plan).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plan gratuit introuvable"})
		return
	}

	expiresAt := time.Now().AddDate(0, 0, plan.DurationDays)
	sub := models.Subscription{
		UserID:           userID.(uint),
		Plan:             plan.Slug,
		Price:            0,
		Status:           "active",
		RenewalDate:      expiresAt,
		ExpiresAt:        &expiresAt,
		MaxListingsBonus: plan.MaxListingsBonus,
	}
	config.DB.Create(&sub)
	config.DB.Create(&models.Notification{
		UserID:  userID.(uint),
		Message: fmt.Sprintf("🎉 Abonnement \"%s\" activé ! Vous pouvez désormais poster %d annonces supplémentaires.", plan.Name, plan.MaxListingsBonus),
		Type:    "success",
	})
	c.JSON(http.StatusCreated, sub)
}

func AdminGetPlans(c *gin.Context) {
	var plans []models.SubscriptionPlan
	config.DB.Order("sort_order ASC, price ASC").Find(&plans)
	c.JSON(http.StatusOK, plans)
}

func AdminCreatePlan(c *gin.Context) {
	var req struct {
		Name             string  `json:"name" binding:"required"`
		Slug             string  `json:"slug" binding:"required"`
		Price            float64 `json:"price"`
		MaxListingsBonus int     `json:"max_listings_bonus"`
		Features         string  `json:"features"`
		IsActive         bool    `json:"is_active"`
		SortOrder        int     `json:"sort_order"`
		DurationDays     int     `json:"duration_days"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.DurationDays <= 0 {
		req.DurationDays = 30
	}
	plan := models.SubscriptionPlan{
		Name:             req.Name,
		Slug:             req.Slug,
		Price:            req.Price,
		MaxListingsBonus: req.MaxListingsBonus,
		Features:         req.Features,
		IsActive:         req.IsActive,
		SortOrder:        req.SortOrder,
		DurationDays:     req.DurationDays,
	}
	if err := config.DB.Create(&plan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur création plan"})
		return
	}
	c.JSON(http.StatusCreated, plan)
}

func AdminUpdatePlan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var plan models.SubscriptionPlan
	if err := config.DB.First(&plan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan introuvable"})
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&plan).Updates(req)
	config.DB.First(&plan, id)
	c.JSON(http.StatusOK, plan)
}

func AdminDeletePlan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	config.DB.Delete(&models.SubscriptionPlan{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Plan supprimé"})
}

func AdminGetUserSubscriptions(c *gin.Context) {
	var subs []models.Subscription
	config.DB.Preload("User").Order("created_at DESC").Find(&subs)
	c.JSON(http.StatusOK, subs)
}

func AdminCancelSubscription(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	config.DB.Model(&models.Subscription{}).Where("id = ?", id).Update("status", "cancelled")
	c.JSON(http.StatusOK, gin.H{"message": "Abonnement annulé"})
}
