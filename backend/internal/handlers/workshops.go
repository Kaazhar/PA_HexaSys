package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func notifierParticipants(workshopID uint, message, notifType string) {
	var bookings []models.WorkshopBooking
	config.DB.Where("workshop_id = ? AND status = ?", workshopID, "confirmed").Find(&bookings)
	for _, b := range bookings {
		config.DB.Create(&models.Notification{
			UserID:  b.UserID,
			Message: message,
			Type:    notifType,
		})
	}
}

func ListerFormations(c *gin.Context) {
	var formations []models.Workshop
	q := config.DB.Preload("Category").Preload("Instructor")

	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	} else {
		q = q.Where("status = ?", "active")
	}

	if typeFormation := c.Query("type"); typeFormation != "" {
		q = q.Where("type = ?", typeFormation)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var total int64
	q.Model(&models.Workshop{}).Count(&total)
	q.Offset(decalage).Limit(limite).Order("date ASC").Find(&formations)

	c.JSON(http.StatusOK, gin.H{
		"workshops": formations,
		"total":     total,
		"page":      page,
		"limit":     limite,
	})
}

func ListerFormationsAdmin(c *gin.Context) {
	var formations []models.Workshop
	q := config.DB.Preload("Category").Preload("Instructor")

	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var total int64
	q.Model(&models.Workshop{}).Count(&total)
	q.Offset(decalage).Limit(limite).Order("created_at DESC").Find(&formations)

	c.JSON(http.StatusOK, gin.H{
		"workshops": formations,
		"total":     total,
		"page":      page,
		"limit":     limite,
	})
}

func ObtenirFormation(c *gin.Context) {
	id := c.Param("id")
	var formation models.Workshop
	if err := config.DB.
		Preload("Category").
		Preload("Instructor").
		Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC, date ASC") }).
		Preload("Chapters", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC") }).
		First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}
	c.JSON(http.StatusOK, formation)
}

type SessionInput struct {
	Date     string `json:"date"`
	Duration int    `json:"duration"`
}

type ChapterInput struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type RequeteFormation struct {
	Title       string         `json:"title" binding:"required"`
	Description string         `json:"description"`
	Objective   string         `json:"objective"`
	Date        string         `json:"date"`
	Duration    int            `json:"duration"`
	Location    string         `json:"location"`
	Price       float64        `json:"price"`
	MaxSpots    int            `json:"max_spots"`
	MinSpots    int            `json:"min_spots"`
	CategoryID  uint           `json:"category_id"`
	Type        string         `json:"type"`
	Image       string         `json:"image"`
	Sessions    []SessionInput `json:"sessions"`
	Chapters    []ChapterInput `json:"chapters"`
}

func parserDateFormation(s string) (time.Time, error) {
	if t, err := time.Parse("2006-01-02T15:04:05Z07:00", s); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02T15:04", s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}

func CreerFormation(c *gin.Context) {
	var req RequeteFormation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idUtilisateur, _ := c.Get("userID")

	var seances []models.WorkshopSession
	for _, s := range req.Sessions {
		if s.Date == "" {
			continue
		}
		d, err := parserDateFormation(s.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format de date de séance invalide"})
			return
		}
		seances = append(seances, models.WorkshopSession{Date: d, Duration: s.Duration})
	}
	sort.Slice(seances, func(i, j int) bool { return seances[i].Date.Before(seances[j].Date) })

	var dateFormation time.Time
	duree := req.Duration
	if len(seances) > 0 {
		dateFormation = seances[0].Date
		duree = seances[0].Duration
	} else {
		d, err := parserDateFormation(req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format de date invalide"})
			return
		}
		dateFormation = d
	}

	maxPlaces := req.MaxSpots
	if maxPlaces == 0 {
		maxPlaces = 15
	}
	minPlaces := req.MinSpots
	if minPlaces == 0 {
		minPlaces = 10
	}

	typeFormation := req.Type
	if typeFormation == "" {
		typeFormation = "atelier"
	}

	formation := models.Workshop{
		Title:        req.Title,
		Description:  req.Description,
		Objective:    req.Objective,
		Date:         dateFormation,
		Duration:     duree,
		Location:     req.Location,
		Price:        req.Price,
		MaxSpots:     maxPlaces,
		MinSpots:     minPlaces,
		CategoryID:   req.CategoryID,
		Type:         typeFormation,
		Image:        req.Image,
		Status:       "pending",
		InstructorID: idUtilisateur.(uint),
	}

	if err := config.DB.Create(&formation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création de la formation"})
		return
	}

	for i := range seances {
		seances[i].WorkshopID = formation.ID
		seances[i].Order = i
	}
	if len(seances) > 0 {
		config.DB.Create(&seances)
	}

	for i, ch := range req.Chapters {
		if ch.Title == "" && ch.Content == "" {
			continue
		}
		config.DB.Create(&models.WorkshopChapter{
			WorkshopID: formation.ID,
			Title:      ch.Title,
			Content:    ch.Content,
			Order:      i,
		})
	}

	config.DB.
		Preload("Category").
		Preload("Instructor").
		Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC, date ASC") }).
		Preload("Chapters", func(db *gorm.DB) *gorm.DB { return db.Order("`order` ASC") }).
		First(&formation, formation.ID)
	c.JSON(http.StatusCreated, formation)
}

func ModifierFormation(c *gin.Context) {
	id := c.Param("id")
	var formation models.Workshop
	if err := config.DB.First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	var modifications map[string]interface{}
	if err := c.ShouldBindJSON(&modifications); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := config.DB.Model(&formation).Updates(modifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la modification"})
		return
	}

	config.DB.Preload("Category").Preload("Instructor").First(&formation, id)
	c.JSON(http.StatusOK, formation)
}

func ValiderFormation(c *gin.Context) {
	id := c.Param("id")
	var formation models.Workshop
	if err := config.DB.First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	config.DB.Model(&formation).Update("status", "active")

	notif := models.Notification{
		UserID:  formation.InstructorID,
		Message: "Votre formation \"" + formation.Title + "\" a été validée !",
		Type:    "success",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Formation validée"})
}

func ReserverFormation(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")

	var formation models.Workshop
	if err := config.DB.First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	if formation.Price > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette formation est payante, veuillez passer par le paiement"})
		return
	}

	if formation.Enrolled >= formation.MaxSpots {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formation complète"})
		return
	}

	var existante models.WorkshopBooking
	if err := config.DB.Where("workshop_id = ? AND user_id = ?", id, idUtilisateur).First(&existante).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Vous êtes déjà inscrit"})
		return
	}

	reservation := models.WorkshopBooking{
		WorkshopID: formation.ID,
		UserID:     idUtilisateur.(uint),
		Status:     "confirmed",
	}

	if err := config.DB.Create(&reservation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de l'inscription"})
		return
	}

	config.DB.Model(&formation).UpdateColumn("enrolled", gorm.Expr("enrolled + 1"))

	c.JSON(http.StatusCreated, reservation)
}

type RequeteAnnulationFormation struct {
	Reason string `json:"reason" binding:"required"`
}

func AnnulerFormation(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var formation models.Workshop
	if err := config.DB.First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && formation.InstructorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	if formation.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette formation est déjà annulée"})
		return
	}

	var req RequeteAnnulationFormation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&formation).Updates(map[string]interface{}{
		"status":        "cancelled",
		"cancel_reason": req.Reason,
	})

	msg := fmt.Sprintf("La formation \"%s\" a été annulée. Raison : %s", formation.Title, req.Reason)
	notifierParticipants(formation.ID, msg, "warning")

	if role == models.RoleAdmin && formation.InstructorID != idUtilisateur.(uint) {
		config.DB.Create(&models.Notification{
			UserID:  formation.InstructorID,
			Message: fmt.Sprintf("Votre formation \"%s\" a été annulée par un administrateur. Raison : %s", formation.Title, req.Reason),
			Type:    "warning",
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Formation annulée, participants notifiés"})
}

func SupprimerFormation(c *gin.Context) {
	id := c.Param("id")

	var formation models.Workshop
	if err := config.DB.First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	msg := fmt.Sprintf("La formation \"%s\" prévue le %s a été supprimée.", formation.Title, formation.Date.Format("02/01/2006"))
	notifierParticipants(formation.ID, msg, "error")

	config.DB.Create(&models.Notification{
		UserID:  formation.InstructorID,
		Message: fmt.Sprintf("Votre formation \"%s\" a été supprimée par un administrateur.", formation.Title),
		Type:    "error",
	})

	config.DB.Delete(&formation)
	c.JSON(http.StatusOK, gin.H{"message": "Formation supprimée, participants notifiés"})
}

func InscritsFormation(c *gin.Context) {
	id := c.Param("id")
	var formation models.Workshop
	if err := config.DB.First(&formation, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	role, _ := userRole.(models.UserRole)
	if role != models.RoleAdmin && formation.InstructorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}

	var reservations []models.WorkshopBooking
	config.DB.Preload("User").
		Where("workshop_id = ? AND status = ?", formation.ID, "confirmed").
		Order("created_at ASC").Find(&reservations)

	type participant struct {
		Firstname string `json:"firstname"`
		Lastname  string `json:"lastname"`
		BookedAt  string `json:"booked_at"`
	}
	participants := make([]participant, 0, len(reservations))
	for _, r := range reservations {
		participants = append(participants, participant{
			Firstname: r.User.Firstname,
			Lastname:  r.User.Lastname,
			BookedAt:  r.CreatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"participants": participants,
		"count":        len(participants),
		"max_spots":    formation.MaxSpots,
	})
}

func MesReservations(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var reservations []models.WorkshopBooking
	config.DB.Preload("Workshop").Preload("Workshop.Category").
		Where("user_id = ? AND status = ?", idUtilisateur, "confirmed").
		Order("created_at DESC").Find(&reservations)
	c.JSON(http.StatusOK, reservations)
}

func VerifierMinInscrits(c *gin.Context) {
	limite := time.Now().Add(48 * time.Hour)
	var formations []models.Workshop
	config.DB.Where("status = 'active' AND date <= ? AND date > ? AND enrolled < min_spots", limite, time.Now()).Find(&formations)

	nbAnnules := 0
	for _, f := range formations {
		raison := fmt.Sprintf("Nombre minimum de participants non atteint (%d/%d inscrits)", f.Enrolled, f.MinSpots)
		config.DB.Model(&f).Updates(map[string]interface{}{
			"status":        "cancelled",
			"cancel_reason": raison,
		})

		msg := fmt.Sprintf("La formation \"%s\" du %s a été annulée : le nombre minimum de participants (%d) n'a pas été atteint.",
			f.Title, f.Date.Format("02/01/2006"), f.MinSpots)
		notifierParticipants(f.ID, msg, "warning")

		config.DB.Create(&models.Notification{
			UserID:  f.InstructorID,
			Message: msg,
			Type:    "warning",
		})
		nbAnnules++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   fmt.Sprintf("%d formation(s) annulée(s) faute de participants", nbAnnules),
		"cancelled": nbAnnules,
	})
}
