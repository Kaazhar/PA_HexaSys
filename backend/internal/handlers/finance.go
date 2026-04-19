package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetFinanceStats(c *gin.Context) {
	var totalInvoices int64
	var pendingAmount float64
	var monthlyRevenue float64
	var annualRevenue float64

	config.DB.Model(&models.Invoice{}).Count(&totalInvoices)

	var pendingInvoices []models.Invoice
	config.DB.Where("status = ?", "pending").Find(&pendingInvoices)
	for _, inv := range pendingInvoices {
		pendingAmount += inv.Total
	}

	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	firstOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())

	config.DB.Model(&models.Invoice{}).
		Where("status = ? AND created_at >= ?", "paid", firstOfMonth).
		Select("COALESCE(SUM(total), 0)").Scan(&monthlyRevenue)

	config.DB.Model(&models.Invoice{}).
		Where("status = ? AND created_at >= ?", "paid", firstOfYear).
		Select("COALESCE(SUM(total), 0)").Scan(&annualRevenue)

	type PlanStat struct {
		Plan  string
		Count int64
		Total float64
	}
	var planStats []PlanStat
	config.DB.Model(&models.Subscription{}).
		Where("status = ?", "active").
		Select("plan, COUNT(*) as count, COALESCE(SUM(price), 0) as total").
		Group("plan").
		Scan(&planStats)

	revenueByPlan := make([]map[string]interface{}, 0, len(planStats))
	for _, ps := range planStats {
		revenueByPlan = append(revenueByPlan, map[string]interface{}{
			"plan":   ps.Plan,
			"amount": ps.Total,
			"count":  ps.Count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_invoices":  totalInvoices,
		"pending_amount":  pendingAmount,
		"monthly_revenue": monthlyRevenue,
		"annual_revenue":  annualRevenue,
		"revenue_by_plan": revenueByPlan,
	})
}

func GetInvoices(c *gin.Context) {
	var invoices []models.Invoice
	query := config.DB.Preload("User")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Order("created_at DESC").Find(&invoices)
	c.JSON(http.StatusOK, invoices)
}

func GetCategories(c *gin.Context) {
	var categories []models.Category
	config.DB.Where("is_active = ?", true).Order("name ASC").Find(&categories)
	c.JSON(http.StatusOK, categories)
}

func CreateCategory(c *gin.Context) {
	var category models.Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}
	c.JSON(http.StatusCreated, category)
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&category)
	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	config.DB.Delete(&models.Category{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Category deleted"})
}
