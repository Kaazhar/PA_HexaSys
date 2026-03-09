package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetFinanceStats(c *gin.Context) {
	var totalInvoices int64
	var pendingAmount float64

	config.DB.Model(&models.Invoice{}).Count(&totalInvoices)

	var invoices []models.Invoice
	config.DB.Where("status = ?", "pending").Find(&invoices)
	for _, inv := range invoices {
		pendingAmount += inv.Total
	}

	c.JSON(http.StatusOK, gin.H{
		"total_invoices":  totalInvoices,
		"pending_amount":  pendingAmount,
		"monthly_revenue": 3850.00,
		"annual_revenue":  38500.00,
		"revenue_by_plan": []map[string]interface{}{
			{"plan": "Découverte", "amount": 0, "count": 45},
			{"plan": "Pro", "amount": 2850, "count": 38},
			{"plan": "Enterprise", "amount": 1000, "count": 5},
		},
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
