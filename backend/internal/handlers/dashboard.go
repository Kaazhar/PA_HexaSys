package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func StatsAdmin(c *gin.Context) {
	var nbUtilisateurs int64
	var nbAnnoncesActives int64
	var nbAnnoncesPending int64
	var nbFormations int64
	var nbFormationsPending int64
	var nbConteneurs int64
	var nbDemandesConteneur int64

	config.DB.Model(&models.User{}).Count(&nbUtilisateurs)
	config.DB.Model(&models.Listing{}).Where("status = ?", "active").Count(&nbAnnoncesActives)
	config.DB.Model(&models.Listing{}).Where("status = ?", "pending").Count(&nbAnnoncesPending)
	config.DB.Model(&models.Workshop{}).Count(&nbFormations)
	config.DB.Model(&models.Workshop{}).Where("status = ?", "pending").Count(&nbFormationsPending)
	config.DB.Model(&models.Container{}).Count(&nbConteneurs)
	config.DB.Model(&models.ContainerRequest{}).Where("status = ?", "pending").Count(&nbDemandesConteneur)

	maintenant := time.Now()
	revenuesMensuels := []map[string]interface{}{}
	for i := 5; i >= 0; i-- {
		mois := maintenant.AddDate(0, -i, 0)
		debut := time.Date(mois.Year(), mois.Month(), 1, 0, 0, 0, 0, maintenant.Location())
		fin := debut.AddDate(0, 1, 0)
		var rev float64
		config.DB.Model(&models.Invoice{}).
			Where("status = ? AND created_at >= ? AND created_at < ?", "paid", debut, fin).
			Select("COALESCE(SUM(total), 0)").Scan(&rev)
		revenuesMensuels = append(revenuesMensuels, map[string]interface{}{
			"month":   mois.Format("Jan"),
			"revenue": rev,
		})
	}

	var revenusMois float64
	premierDuMois := time.Date(maintenant.Year(), maintenant.Month(), 1, 0, 0, 0, 0, maintenant.Location())
	config.DB.Model(&models.Invoice{}).
		Where("status = ? AND created_at >= ?", "paid", premierDuMois).
		Select("COALESCE(SUM(total), 0)").Scan(&revenusMois)

	c.JSON(http.StatusOK, gin.H{
		"total_users":                nbUtilisateurs,
		"active_listings":            nbAnnoncesActives,
		"pending_listings":           nbAnnoncesPending,
		"total_workshops":            nbFormations,
		"pending_workshops":          nbFormationsPending,
		"total_containers":           nbConteneurs,
		"pending_container_requests": nbDemandesConteneur,
		"monthly_revenue":            revenuesMensuels,
		"monthly_revenue_total":      revenusMois,
	})
}

func StatsPubliques(c *gin.Context) {
	var nbUtilisateurs int64
	var nbAnnonces int64
	var totalCO2 float64
	var totalDechets float64

	config.DB.Model(&models.User{}).Count(&nbUtilisateurs)
	config.DB.Model(&models.Listing{}).Where("status = ?", "active").Count(&nbAnnonces)
	config.DB.Model(&models.UpcyclingScore{}).Select("COALESCE(SUM(co2_saved_kg), 0)").Scan(&totalCO2)
	config.DB.Model(&models.UpcyclingScore{}).Select("COALESCE(SUM(waste_avoided_kg), 0)").Scan(&totalDechets)

	c.JSON(http.StatusOK, gin.H{
		"total_users":      nbUtilisateurs,
		"active_listings":  nbAnnonces,
		"co2_saved_kg":     totalCO2,
		"waste_avoided_kg": totalDechets,
	})
}

func DashboardParticulier(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var mesAnnonces []models.Listing
	config.DB.Preload("Category").Where("user_id = ?", idUtilisateur).
		Order("created_at DESC").Limit(5).Find(&mesAnnonces)

	var nbAnnoncesActives int64
	config.DB.Model(&models.Listing{}).Where("user_id = ? AND status = ?", idUtilisateur, "active").Count(&nbAnnoncesActives)

	var mesReservations []models.WorkshopBooking
	config.DB.Preload("Workshop").Where("user_id = ?", idUtilisateur).
		Order("created_at DESC").Limit(3).Find(&mesReservations)

	var scoreUpcycling models.UpcyclingScore
	config.DB.Where("user_id = ?", idUtilisateur).First(&scoreUpcycling)

	var prochainesFormations []models.Workshop
	config.DB.Preload("Category").Where("status = ? AND date > ?", "active", time.Now()).
		Order("date ASC").Limit(3).Find(&prochainesFormations)

	type StatMois struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	maintenant := time.Now()
	annoncesParMois := []StatMois{}
	for i := 5; i >= 0; i-- {
		m := maintenant.AddDate(0, -i, 0)
		debut := time.Date(m.Year(), m.Month(), 1, 0, 0, 0, 0, maintenant.Location())
		fin := debut.AddDate(0, 1, 0)
		var nb int64
		config.DB.Model(&models.Listing{}).
			Where("user_id = ? AND created_at >= ? AND created_at < ?", idUtilisateur, debut, fin).
			Count(&nb)
		annoncesParMois = append(annoncesParMois, StatMois{Month: m.Format("Jan"), Count: nb})
	}

	c.JSON(http.StatusOK, gin.H{
		"my_listings":        mesAnnonces,
		"active_listings":    nbAnnoncesActives,
		"bookings":           mesReservations,
		"score":              scoreUpcycling,
		"upcoming_workshops": prochainesFormations,
		"monthly_listings":   annoncesParMois,
	})
}

func DashboardPro(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var projets []models.Project
	config.DB.Where("user_id = ?", idUtilisateur).Order("created_at DESC").Limit(5).Find(&projets)

	var abonnement models.Subscription
	config.DB.Where("user_id = ?", idUtilisateur).First(&abonnement)

	var mesAnnonces []models.Listing
	config.DB.Preload("Category").Where("user_id = ?", idUtilisateur).
		Order("created_at DESC").Limit(5).Find(&mesAnnonces)

	reponse := gin.H{
		"projects":     projets,
		"subscription": abonnement,
		"my_listings":  mesAnnonces,
	}

	if abonnement.Status == "active" {
		var nbDons int64
		config.DB.Model(&models.Listing{}).
			Where("user_id = ? AND type = 'don' AND status = 'active'", idUtilisateur).
			Count(&nbDons)

		var poidsTotal float64
		config.DB.Model(&models.Listing{}).
			Where("user_id = ? AND type = 'don' AND status = 'active' AND weight > 0", idUtilisateur).
			Select("COALESCE(SUM(weight), 0)").Scan(&poidsTotal)

		type StatCategorie struct {
			Name  string `json:"name"`
			Count int64  `json:"count"`
		}
		var topCategories []StatCategorie
		config.DB.Table("listings").
			Select("categories.name, COUNT(listings.id) as count").
			Joins("JOIN categories ON listings.category_id = categories.id").
			Where("listings.status = 'active'").
			Group("categories.id, categories.name").
			Order("count DESC").
			Limit(5).
			Scan(&topCategories)

		var nbNouveauxDepots int64
		config.DB.Model(&models.ContainerRequest{}).
			Where("status = 'approved' AND updated_at > ?", time.Now().AddDate(0, 0, -7)).
			Count(&nbNouveauxDepots)

		var nbNouvellesAnnonces int64
		config.DB.Model(&models.Listing{}).
			Where("status = 'active' AND created_at > ?", time.Now().AddDate(0, 0, -7)).
			Count(&nbNouvellesAnnonces)

		reponse["premium_stats"] = gin.H{
			"donations_count": nbDons,
			"total_weight":    poidsTotal,
			"co2_saved":       poidsTotal * 2.5,
			"top_categories":  topCategories,
			"new_deposits":    nbNouveauxDepots,
			"new_listings":    nbNouvellesAnnonces,
		}
	}

	c.JSON(http.StatusOK, reponse)
}

func DashboardSalarie(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var mesFormations []models.Workshop
	config.DB.Preload("Category").Where("instructor_id = ?", idUtilisateur).
		Order("date ASC").Limit(5).Find(&mesFormations)

	var mesArticles []models.Article
	config.DB.Where("author_id = ?", idUtilisateur).Order("created_at DESC").Limit(5).Find(&mesArticles)

	var prochainesFormations []models.Workshop
	config.DB.Preload("Category").Where("status = ? AND date > ?", "active", time.Now()).
		Order("date ASC").Limit(5).Find(&prochainesFormations)

	c.JSON(http.StatusOK, gin.H{
		"my_workshops":       mesFormations,
		"my_articles":        mesArticles,
		"upcoming_workshops": prochainesFormations,
	})
}
