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

func GetPublicStats(c *gin.Context) {
	var totalUsers int64
	var activeListings int64
	var totalCO2 float64
	var totalWaste float64

	config.DB.Model(&models.User{}).Count(&totalUsers)
	config.DB.Model(&models.Listing{}).Where("status = ?", "active").Count(&activeListings)
	config.DB.Model(&models.UpcyclingScore{}).Select("COALESCE(SUM(co2_saved_kg), 0)").Scan(&totalCO2)
	config.DB.Model(&models.UpcyclingScore{}).Select("COALESCE(SUM(waste_avoided_kg), 0)").Scan(&totalWaste)

	c.JSON(http.StatusOK, gin.H{
		"total_users":     totalUsers,
		"active_listings": activeListings,
		"co2_saved_kg":    totalCO2,
		"waste_avoided_kg": totalWaste,
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

	type MonthStat struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	now := time.Now()
	monthlyListings := []MonthStat{}
	for i := 5; i >= 0; i-- {
		m := now.AddDate(0, -i, 0)
		start := time.Date(m.Year(), m.Month(), 1, 0, 0, 0, 0, now.Location())
		end := start.AddDate(0, 1, 0)
		var count int64
		config.DB.Model(&models.Listing{}).
			Where("user_id = ? AND created_at >= ? AND created_at < ?", userID, start, end).
			Count(&count)
		monthlyListings = append(monthlyListings, MonthStat{Month: m.Format("Jan"), Count: count})
	}

	c.JSON(http.StatusOK, gin.H{
		"my_listings":        myListings,
		"active_listings":    myListingsCount,
		"bookings":           myBookings,
		"score":              score,
		"upcoming_workshops": upcomingWorkshops,
		"monthly_listings":   monthlyListings,
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

	response := gin.H{
		"projects":     projects,
		"subscription": subscription,
		"my_listings":  myListings,
	}

	if subscription.Status == "active" {
		var donationsCount int64
		config.DB.Model(&models.Listing{}).
			Where("user_id = ? AND type = 'don' AND status = 'active'", userID).
			Count(&donationsCount)

		var totalWeight float64
		config.DB.Model(&models.Listing{}).
			Where("user_id = ? AND type = 'don' AND status = 'active' AND weight > 0", userID).
			Select("COALESCE(SUM(weight), 0)").Scan(&totalWeight)

		type CatStat struct {
			Name  string `json:"name"`
			Count int64  `json:"count"`
		}
		var topCategories []CatStat
		config.DB.Table("listings").
			Select("categories.name, COUNT(listings.id) as count").
			Joins("JOIN categories ON listings.category_id = categories.id").
			Where("listings.status = 'active'").
			Group("categories.id, categories.name").
			Order("count DESC").
			Limit(5).
			Scan(&topCategories)

		var newDeposits int64
		config.DB.Model(&models.ContainerRequest{}).
			Where("status = 'approved' AND updated_at > ?", time.Now().AddDate(0, 0, -7)).
			Count(&newDeposits)

		var newListings int64
		config.DB.Model(&models.Listing{}).
			Where("status = 'active' AND created_at > ?", time.Now().AddDate(0, 0, -7)).
			Count(&newListings)

		response["premium_stats"] = gin.H{
			"donations_count": donationsCount,
			"total_weight":    totalWeight,
			"co2_saved":       totalWeight * 2.5,
			"top_categories":  topCategories,
			"new_deposits":    newDeposits,
			"new_listings":    newListings,
		}
	}

	c.JSON(http.StatusOK, response)
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
