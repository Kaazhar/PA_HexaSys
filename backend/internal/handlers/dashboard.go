package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetAdminStats(c *gin.Context) {
	var totalUsers int64
	var activeListings int64
	var pendingListings int64
	var totalWorkshops int64
	var pendingWorkshops int64
	var totalContainers int64
	var pendingContainerRequests int64

	config.DB.Model(&models.User{}).Count(&totalUsers)
	config.DB.Model(&models.Listing{}).Where("status = ?", "active").Count(&activeListings)
	config.DB.Model(&models.Listing{}).Where("status = ?", "pending").Count(&pendingListings)
	config.DB.Model(&models.Workshop{}).Count(&totalWorkshops)
	config.DB.Model(&models.Workshop{}).Where("status = ?", "pending").Count(&pendingWorkshops)
	config.DB.Model(&models.Container{}).Count(&totalContainers)
	config.DB.Model(&models.ContainerRequest{}).Where("status = ?", "pending").Count(&pendingContainerRequests)

	now := time.Now()
	monthlyRevenue := []map[string]interface{}{}
	for i := 5; i >= 0; i-- {
		month := now.AddDate(0, -i, 0)
		start := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, now.Location())
		end := start.AddDate(0, 1, 0)
		var rev float64
		config.DB.Model(&models.Invoice{}).
			Where("status = ? AND created_at >= ? AND created_at < ?", "paid", start, end).
			Select("COALESCE(SUM(total), 0)").Scan(&rev)
		monthlyRevenue = append(monthlyRevenue, map[string]interface{}{
			"month":   month.Format("Jan"),
			"revenue": rev,
		})
	}

	var monthlyRevenueTotal float64
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	config.DB.Model(&models.Invoice{}).
		Where("status = ? AND created_at >= ?", "paid", firstOfMonth).
		Select("COALESCE(SUM(total), 0)").Scan(&monthlyRevenueTotal)

	c.JSON(http.StatusOK, gin.H{
		"total_users":                totalUsers,
		"active_listings":            activeListings,
		"pending_listings":           pendingListings,
		"total_workshops":            totalWorkshops,
		"pending_workshops":          pendingWorkshops,
		"total_containers":           totalContainers,
		"pending_container_requests": pendingContainerRequests,
		"monthly_revenue":            monthlyRevenue,
		"monthly_revenue_total":      monthlyRevenueTotal,
	})
}

func GetParticularDashboard(c *gin.Context) {
	userID, _ := c.Get("userID")

	var myListings []models.Listing
	config.DB.Preload("Category").Where("user_id = ?", userID).
		Order("created_at DESC").Limit(5).Find(&myListings)

	var myListingsCount int64
	config.DB.Model(&models.Listing{}).Where("user_id = ? AND status = ?", userID, "active").Count(&myListingsCount)

	var myBookings []models.WorkshopBooking
	config.DB.Preload("Workshop").Where("user_id = ?", userID).
		Order("created_at DESC").Limit(3).Find(&myBookings)

	var score models.UpcyclingScore
	config.DB.Where("user_id = ?", userID).First(&score)

	var upcomingWorkshops []models.Workshop
	config.DB.Preload("Category").Where("status = ? AND date > ?", "active", time.Now()).
		Order("date ASC").Limit(3).Find(&upcomingWorkshops)

	c.JSON(http.StatusOK, gin.H{
		"my_listings":        myListings,
		"active_listings":    myListingsCount,
		"bookings":           myBookings,
		"score":              score,
		"upcoming_workshops": upcomingWorkshops,
	})
}

func GetProDashboard(c *gin.Context) {
	userID, _ := c.Get("userID")

	var projects []models.Project
	config.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(5).Find(&projects)

	var subscription models.Subscription
	config.DB.Where("user_id = ?", userID).First(&subscription)

	var myListings []models.Listing
	config.DB.Preload("Category").Where("user_id = ?", userID).
		Order("created_at DESC").Limit(5).Find(&myListings)

	c.JSON(http.StatusOK, gin.H{
		"projects":     projects,
		"subscription": subscription,
		"my_listings":  myListings,
	})
}

func GetSalarieDashboard(c *gin.Context) {
	userID, _ := c.Get("userID")

	var myWorkshops []models.Workshop
	config.DB.Preload("Category").Where("instructor_id = ?", userID).
		Order("date ASC").Limit(5).Find(&myWorkshops)

	var myArticles []models.Article
	config.DB.Where("author_id = ?", userID).Order("created_at DESC").Limit(5).Find(&myArticles)

	var upcomingWorkshops []models.Workshop
	config.DB.Preload("Category").Where("status = ? AND date > ?", "active", time.Now()).
		Order("date ASC").Limit(5).Find(&upcomingWorkshops)

	c.JSON(http.StatusOK, gin.H{
		"my_workshops":       myWorkshops,
		"my_articles":        myArticles,
		"upcoming_workshops": upcomingWorkshops,
	})
}
