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

func LimiteAnnonces(idUtilisateur uint) int {
	var abonnements []models.Subscription
	maintenant := time.Now()
	config.DB.Where("user_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)", idUtilisateur, maintenant).Find(&abonnements)
	total := BaseListingLimit
	for _, a := range abonnements {
		total += a.MaxListingsBonus
	}
	return total
}

func ListerPlansAbonnement(c *gin.Context) {
	var plans []models.SubscriptionPlan
	config.DB.Where("is_active = true").Order("sort_order ASC, price ASC").Find(&plans)
	c.JSON(http.StatusOK, plans)
}

func MesAbonnements(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	maintenant := time.Now()
	bientot := maintenant.Add(3 * 24 * time.Hour)

	var abonnements []models.Subscription
	config.DB.Where("user_id = ? AND status = 'active'", idUtilisateur).Order("expires_at ASC").Find(&abonnements)

	for i := range abonnements {
		if abonnements[i].ExpiresAt != nil && abonnements[i].ExpiresAt.Before(bientot) && !abonnements[i].NotifiedExpiry {
			jours := int(time.Until(*abonnements[i].ExpiresAt).Hours() / 24)
			msg := fmt.Sprintf("⏰ Votre abonnement \"%s\" expire dans %d jour(s). Renouvelez-le pour conserver vos avantages.", abonnements[i].Plan, jours)
			config.DB.Create(&models.Notification{UserID: idUtilisateur.(uint), Message: msg, Type: "warning"})
			config.DB.Model(&abonnements[i]).Update("notified_expiry", true)
		}
	}

	plafond := LimiteAnnonces(idUtilisateur.(uint))
	c.JSON(http.StatusOK, gin.H{"subscriptions": abonnements, "listing_limit": plafond, "base_limit": BaseListingLimit})
}

func SouscrirePlanGratuit(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

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

	expiration := time.Now().AddDate(0, 0, plan.DurationDays)
	abonnement := models.Subscription{
		UserID:           idUtilisateur.(uint),
		Plan:             plan.Slug,
		Price:            0,
		Status:           "active",
		RenewalDate:      expiration,
		ExpiresAt:        &expiration,
		MaxListingsBonus: plan.MaxListingsBonus,
	}
	config.DB.Create(&abonnement)
	config.DB.Create(&models.Notification{
		UserID:  idUtilisateur.(uint),
		Message: fmt.Sprintf("🎉 Abonnement \"%s\" activé ! Vous pouvez désormais poster %d annonces supplémentaires.", plan.Name, plan.MaxListingsBonus),
		Type:    "success",
	})
	c.JSON(http.StatusCreated, abonnement)
}

func AdminListerPlans(c *gin.Context) {
	var plans []models.SubscriptionPlan
	config.DB.Order("sort_order ASC, price ASC").Find(&plans)
	c.JSON(http.StatusOK, plans)
}

func AdminCreerPlan(c *gin.Context) {
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

func AdminModifierPlan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var plan models.SubscriptionPlan
	if err := config.DB.First(&plan, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan introuvable"})
		return
	}
	var modifications map[string]interface{}
	if err := c.ShouldBindJSON(&modifications); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&plan).Updates(modifications)
	config.DB.First(&plan, id)
	c.JSON(http.StatusOK, plan)
}

func AdminSupprimerPlan(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	config.DB.Delete(&models.SubscriptionPlan{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Plan supprimé"})
}

func AdminAbonnementsUtilisateurs(c *gin.Context) {
	var abonnements []models.Subscription
	config.DB.Preload("User").Order("created_at DESC").Find(&abonnements)
	c.JSON(http.StatusOK, abonnements)
}

func AdminAnnulerAbonnement(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	config.DB.Model(&models.Subscription{}).Where("id = ?", id).Update("status", "cancelled")
	c.JSON(http.StatusOK, gin.H{"message": "Abonnement annulé"})
}
