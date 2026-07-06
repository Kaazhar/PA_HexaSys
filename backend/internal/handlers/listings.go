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

func ListerAnnonces(c *gin.Context) {
	config.DB.Model(&models.Listing{}).Where("is_sponsored = true AND sponsored_until < ?", time.Now()).Updates(map[string]interface{}{"is_sponsored": false, "sponsored_until": nil})

	var annonces []models.Listing
	q := config.DB.Preload("Category").Preload("User")

	role, _ := c.Get("userRole")
	roleUtilisateur, _ := role.(models.UserRole)
	if roleUtilisateur != models.RoleAdmin {
		if statut := c.Query("status"); statut != "" {
			q = q.Where("status = ?", statut)
		} else {
			q = q.Where("status = ?", "active")
		}
	} else {
		if statut := c.Query("status"); statut != "" {
			q = q.Where("status = ?", statut)
		}
	}

	if categorie := c.Query("category"); categorie != "" {
		q = q.Where("category_id = ?", categorie)
	}
	if typeAnnonce := c.Query("type"); typeAnnonce != "" {
		q = q.Where("type = ?", typeAnnonce)
	}
	if recherche := c.Query("search"); recherche != "" {
		q = q.Where("title LIKE ? OR description LIKE ?", "%"+recherche+"%", "%"+recherche+"%")
	}
	if localisation := c.Query("location"); localisation != "" {
		q = q.Where("location LIKE ?", "%"+localisation+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var total int64
	q.Model(&models.Listing{}).Count(&total)
	q.Offset(decalage).Limit(limite).Order("is_sponsored DESC, created_at DESC").Find(&annonces)

	c.JSON(http.StatusOK, gin.H{
		"listings": annonces,
		"total":    total,
		"page":     page,
		"limit":    limite,
	})
}

func ObtenirAnnonce(c *gin.Context) {
	id := c.Param("id")
	var annonce models.Listing
	if err := config.DB.Preload("Category").Preload("User").First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	c.JSON(http.StatusOK, annonce)
}

type RequeteAnnonce struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Type        string  `json:"type" binding:"required"`
	CategoryID  uint    `json:"category_id"`
	Condition   string  `json:"condition"`
	Price       float64 `json:"price"`
	Location    string  `json:"location"`
	Images      string  `json:"images"`
}

func CreerAnnonce(c *gin.Context) {
	var req RequeteAnnonce
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if interdit, mot := services.ContientMotInterdit(req.Title, req.Description); interdit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Votre annonce contient un terme interdit : '" + mot + "'. Merci de le retirer."})
		return
	}

	idUtilisateur, _ := c.Get("userID")

	var nbAnnonces int64
	config.DB.Model(&models.Listing{}).Where("user_id = ? AND status IN ('active', 'pending')", idUtilisateur).Count(&nbAnnonces)
	plafond := LimiteAnnonces(idUtilisateur.(uint))
	if int(nbAnnonces) >= plafond {
		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Limite d'annonces atteinte (%d/%d). Souscrivez un abonnement pour publier plus d'annonces.", nbAnnonces, plafond)})
		return
	}

	annonce := models.Listing{
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		CategoryID:  req.CategoryID,
		Condition:   req.Condition,
		Price:       req.Price,
		Location:    req.Location,
		Images:      req.Images,
		Status:      "pending",
		UserID:      idUtilisateur.(uint),
	}

	if err := config.DB.Create(&annonce).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création de l'annonce"})
		return
	}

	entreeScore := models.ScoreEntry{
		UserID: idUtilisateur.(uint),
		Points: 10,
		Reason: "Annonce créée",
		Action: "listing_created",
	}
	config.DB.Create(&entreeScore)
	poids := annonce.Weight
	if poids <= 0 {
		poids = 1.0
	}
	config.DB.Model(&models.UpcyclingScore{}).Where("user_id = ?", idUtilisateur).Updates(map[string]interface{}{
		"total_points":       gorm.Expr("total_points + ?", 10),
		"waste_avoided_kg":   gorm.Expr("waste_avoided_kg + ?", poids),
		"co2_saved_kg":       gorm.Expr("co2_saved_kg + ?", poids*2.5),
		"water_saved_liters": gorm.Expr("water_saved_liters + ?", poids*50),
	})

	config.DB.Preload("Category").Preload("User").First(&annonce, annonce.ID)
	c.JSON(http.StatusCreated, annonce)
}

func ValiderAnnonce(c *gin.Context) {
	id := c.Param("id")
	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	config.DB.Model(&annonce).Updates(map[string]interface{}{
		"status":        "active",
		"reject_reason": "",
	})

	notif := models.Notification{
		UserID:  annonce.UserID,
		Message: "Votre annonce \"" + annonce.Title + "\" a été validée !",
		Type:    "success",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Annonce validée", "listing": annonce})
}

type RequeteRejet struct {
	Reason string `json:"reason" binding:"required"`
}

func RejeterAnnonce(c *gin.Context) {
	id := c.Param("id")
	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	var req RequeteRejet
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&annonce).Updates(map[string]interface{}{
		"status":        "rejected",
		"reject_reason": req.Reason,
	})

	notif := models.Notification{
		UserID:  annonce.UserID,
		Message: "Votre annonce \"" + annonce.Title + "\" a été rejetée : " + req.Reason,
		Type:    "error",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Annonce rejetée"})
}

func MesAnnonces(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var annonces []models.Listing
	q := config.DB.Preload("Category").Where("user_id = ?", idUtilisateur)
	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite
	var total int64
	q.Model(&models.Listing{}).Count(&total)
	q.Offset(decalage).Limit(limite).Order("created_at DESC").Find(&annonces)
	c.JSON(http.StatusOK, gin.H{"listings": annonces, "total": total, "page": page, "limit": limite})
}

func MarquerVendue(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	if annonce.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	commission := annonce.Price * (annonce.CommissionRate / 100)
	config.DB.Model(&annonce).Updates(map[string]interface{}{
		"status":            "sold",
		"commission_amount": commission,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Annonce marquée comme vendue", "commission": commission})
}

func ModererAnnonce(c *gin.Context) {
	id := c.Param("id")
	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	var req struct {
		IsModerated    bool   `json:"is_moderated"`
		ModerationNote string `json:"moderation_note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&annonce).Updates(map[string]interface{}{
		"is_moderated":    req.IsModerated,
		"moderation_note": req.ModerationNote,
	})
	c.JSON(http.StatusOK, annonce)
}

func SupprimerAnnonce(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	roleRaw, _ := c.Get("userRole")
	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	role := roleRaw.(models.UserRole)
	if role != models.RoleAdmin && annonce.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&annonce)
	c.JSON(http.StatusOK, gin.H{"message": "Annonce supprimée"})
}

func ListerAnnoncesAdmin(c *gin.Context) {
	var annonces []models.Listing
	q := config.DB.Preload("Category").Preload("User")

	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}
	if recherche := c.Query("search"); recherche != "" {
		q = q.Where("title LIKE ? OR description LIKE ?", "%"+recherche+"%", "%"+recherche+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var total int64
	q.Model(&models.Listing{}).Count(&total)
	q.Offset(decalage).Limit(limite).Order("created_at DESC").Find(&annonces)

	c.JSON(http.StatusOK, gin.H{
		"listings": annonces,
		"total":    total,
		"page":     page,
		"limit":    limite,
	})
}

func ModifierAnnonce(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	roleRaw, _ := c.Get("userRole")

	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	role := roleRaw.(models.UserRole)
	if role != models.RoleAdmin && annonce.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req RequeteAnnonce
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if interdit, mot := services.ContientMotInterdit(req.Title, req.Description); interdit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Votre annonce contient un terme interdit : '" + mot + "'. Merci de le retirer."})
		return
	}

	config.DB.Model(&annonce).Updates(map[string]interface{}{
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

	config.DB.Preload("Category").Preload("User").First(&annonce, annonce.ID)
	c.JSON(http.StatusOK, annonce)
}

func BoosterAnnonce(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	id := c.Param("id")

	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	if annonce.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}
	if annonce.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "L'annonce doit être active pour être boostée"})
		return
	}
	if annonce.IsSponsored && annonce.SponsoredUntil != nil && annonce.SponsoredUntil.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette annonce est déjà boostée"})
		return
	}

	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)

	if !utilisateur.HasUsedFreeBoost {
		finSponsoring := time.Now().Add(24 * time.Hour)
		config.DB.Model(&annonce).Updates(map[string]interface{}{
			"is_sponsored":    true,
			"sponsored_until": finSponsoring,
		})
		config.DB.Model(&utilisateur).Update("has_used_free_boost", true)
		c.JSON(http.StatusOK, gin.H{"free": true, "sponsored_until": finSponsoring})
		return
	}

	urlPaiement, err := creerSessionBoost(annonce.ID, idUtilisateur.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"checkout_url": urlPaiement})
}

func SponsoriserAnnonce(c *gin.Context) {
	id := c.Param("id")
	var annonce models.Listing
	if err := config.DB.First(&annonce, id).Error; err != nil {
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

	config.DB.Model(&annonce).Update("is_sponsored", req.IsSponsored)
	c.JSON(http.StatusOK, gin.H{"is_sponsored": req.IsSponsored})
}
