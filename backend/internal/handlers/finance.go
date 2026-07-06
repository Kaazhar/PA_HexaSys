package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func StatsFinance(c *gin.Context) {
	var nbFactures int64
	var montantEnAttente float64
	var revenusMois float64
	var revenusAnnee float64
	var totalCommissions float64
	var commissionsMois float64
	var nbVentes int64

	config.DB.Model(&models.Invoice{}).Count(&nbFactures)

	var facturesEnAttente []models.Invoice
	config.DB.Where("status = ?", "pending").Find(&facturesEnAttente)
	for _, f := range facturesEnAttente {
		montantEnAttente += f.Total
	}

	maintenant := time.Now()
	premierDuMois := time.Date(maintenant.Year(), maintenant.Month(), 1, 0, 0, 0, 0, maintenant.Location())
	premierDeLAnnee := time.Date(maintenant.Year(), 1, 1, 0, 0, 0, 0, maintenant.Location())

	config.DB.Model(&models.Invoice{}).
		Where("status = ? AND created_at >= ?", "paid", premierDuMois).
		Select("COALESCE(SUM(total), 0)").Scan(&revenusMois)

	config.DB.Model(&models.Invoice{}).
		Where("status = ? AND created_at >= ?", "paid", premierDeLAnnee).
		Select("COALESCE(SUM(total), 0)").Scan(&revenusAnnee)

	config.DB.Model(&models.Listing{}).
		Where("status = ? AND type = ?", "sold", "vente").
		Count(&nbVentes)

	config.DB.Model(&models.Listing{}).
		Where("status = ? AND type = ?", "sold", "vente").
		Select("COALESCE(SUM(commission_amount), 0)").Scan(&totalCommissions)

	config.DB.Model(&models.Listing{}).
		Where("status = ? AND type = ? AND updated_at >= ?", "sold", "vente", premierDuMois).
		Select("COALESCE(SUM(commission_amount), 0)").Scan(&commissionsMois)

	type StatPlan struct {
		Plan  string
		Count int64
		Total float64
	}
	var statsPlans []StatPlan
	config.DB.Model(&models.Subscription{}).
		Where("status = ?", "active").
		Select("plan, COUNT(*) as count, COALESCE(SUM(price), 0) as total").
		Group("plan").
		Scan(&statsPlans)

	revenusParPlan := make([]map[string]interface{}, 0, len(statsPlans))
	for _, sp := range statsPlans {
		revenusParPlan = append(revenusParPlan, map[string]interface{}{
			"plan":   sp.Plan,
			"amount": sp.Total,
			"count":  sp.Count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_invoices":      nbFactures,
		"pending_amount":      montantEnAttente,
		"monthly_revenue":     revenusMois,
		"annual_revenue":      revenusAnnee,
		"revenue_by_plan":     revenusParPlan,
		"total_commissions":   totalCommissions,
		"monthly_commissions": commissionsMois,
		"total_sold_listings": nbVentes,
	})
}

func ListerFactures(c *gin.Context) {
	var factures []models.Invoice
	q := config.DB.Preload("User")

	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}

	q.Order("created_at DESC").Find(&factures)
	c.JSON(http.StatusOK, factures)
}

func ListerCategories(c *gin.Context) {
	var categories []models.Category
	config.DB.Where("is_active = ?", true).Order("name ASC").Find(&categories)
	c.JSON(http.StatusOK, categories)
}

func CreerCategorie(c *gin.Context) {
	var categorie models.Category
	if err := c.ShouldBindJSON(&categorie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&categorie).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création"})
		return
	}
	c.JSON(http.StatusCreated, categorie)
}

func ModifierCategorie(c *gin.Context) {
	id := c.Param("id")
	var categorie models.Category
	if err := config.DB.First(&categorie, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Catégorie introuvable"})
		return
	}
	if err := c.ShouldBindJSON(&categorie); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&categorie)
	c.JSON(http.StatusOK, categorie)
}

func SupprimerCategorie(c *gin.Context) {
	id := c.Param("id")
	config.DB.Delete(&models.Category{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Catégorie supprimée"})
}
