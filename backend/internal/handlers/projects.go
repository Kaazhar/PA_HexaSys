package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func ListerProjets(c *gin.Context) {
	var projets []models.Project
	q := config.DB.Preload("User")
	if recherche := c.Query("search"); recherche != "" {
		q = q.Where("title LIKE ? OR description LIKE ?", "%"+recherche+"%", "%"+recherche+"%")
	}
	q.Order("created_at DESC").Find(&projets)
	c.JSON(http.StatusOK, projets)
}

func MesProjets(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var projets []models.Project
	config.DB.Where("user_id = ?", idUtilisateur).Order("created_at DESC").Find(&projets)
	c.JSON(http.StatusOK, projets)
}

func CreerProjet(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req struct {
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description"`
		BeforeImages string `json:"before_images"`
		AfterImages  string `json:"after_images"`
		Tags         string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	projet := models.Project{
		Title:        req.Title,
		Description:  req.Description,
		BeforeImages: req.BeforeImages,
		AfterImages:  req.AfterImages,
		Tags:         req.Tags,
		UserID:       idUtilisateur.(uint),
	}
	if err := config.DB.Create(&projet).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur création"})
		return
	}
	creerSujetForumProjet(&projet)
	c.JSON(http.StatusCreated, projet)
}

func creerSujetForumProjet(projet *models.Project) uint {
	var sujet models.ForumTopic
	if err := config.DB.Where("project_id = ?", projet.ID).First(&sujet).Error; err == nil {
		return sujet.ID
	}
	sujet = models.ForumTopic{
		Title:     "Projet : " + projet.Title,
		Content:   "Espace communautaire du projet \"" + projet.Title + "\". Réservé aux abonnés.",
		AuthorID:  projet.UserID,
		ProjectID: &projet.ID,
	}
	config.DB.Create(&sujet)
	return sujet.ID
}

func notifierSuiveurs(idProjet uint, message string) {
	var suiveurs []models.ProjectFollower
	config.DB.Where("project_id = ?", idProjet).Find(&suiveurs)
	for _, s := range suiveurs {
		config.DB.Create(&models.Notification{
			UserID:  s.UserID,
			Message: message,
			Type:    "info",
		})
	}
}

func ObtenirProjet(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var projet models.Project
	if err := config.DB.Preload("User").First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}

	config.DB.Exec("UPDATE projects SET views = views + 1 WHERE id = ?", projet.ID)
	projet.Views++

	var etapes []models.ProjectUpdate
	config.DB.Where("project_id = ?", id).Order("created_at ASC").Find(&etapes)

	var nbSuiveurs int64
	config.DB.Model(&models.ProjectFollower{}).Where("project_id = ?", id).Count(&nbSuiveurs)

	estSuivi := false
	if idUtilisateur, ok := c.Get("userID"); ok {
		var nb int64
		config.DB.Model(&models.ProjectFollower{}).Where("project_id = ? AND user_id = ?", id, idUtilisateur).Count(&nb)
		estSuivi = nb > 0
	}

	idSujetForum := creerSujetForumProjet(&projet)

	c.JSON(http.StatusOK, gin.H{
		"project":         projet,
		"updates":         etapes,
		"followers_count": nbSuiveurs,
		"is_following":    estSuivi,
		"forum_topic_id":  idSujetForum,
	})
}

func SuivreProjet(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")

	var projet models.Project
	if err := config.DB.First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}

	var existant models.ProjectFollower
	if err := config.DB.Where("project_id = ? AND user_id = ?", id, idUtilisateur).First(&existant).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Déjà abonné"})
		return
	}

	config.DB.Create(&models.ProjectFollower{ProjectID: uint(id), UserID: idUtilisateur.(uint)})
	c.JSON(http.StatusOK, gin.H{"message": "Abonné au projet"})
}

func NePlusSuivreProjet(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")
	config.DB.Where("project_id = ? AND user_id = ?", id, idUtilisateur).Delete(&models.ProjectFollower{})
	c.JSON(http.StatusOK, gin.H{"message": "Désabonné du projet"})
}

func AjouterMiseAJour(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var projet models.Project
	if err := config.DB.First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	if userRole.(models.UserRole) != models.RoleAdmin && projet.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req struct {
		ImageURL     string `json:"image_url"`
		Comment      string `json:"comment"`
		Description  string `json:"description"`
		BeforeImages string `json:"before_images"`
		AfterImages  string `json:"after_images"`
		Tags         string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Description == "" && req.Comment == "" && req.ImageURL == "" && req.BeforeImages == "" && req.AfterImages == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ajoutez au moins une description ou une image"})
		return
	}

	etape := models.ProjectUpdate{
		ProjectID:    uint(id),
		ImageURL:     req.ImageURL,
		Comment:      req.Comment,
		Description:  req.Description,
		BeforeImages: req.BeforeImages,
		AfterImages:  req.AfterImages,
		Tags:         req.Tags,
	}
	config.DB.Create(&etape)

	notifierSuiveurs(uint(id), "Nouvelle étape sur le projet \""+projet.Title+"\"")
	c.JSON(http.StatusCreated, etape)
}

func ModifierMiseAJour(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idEtape, _ := strconv.Atoi(c.Param("updateId"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var projet models.Project
	if err := config.DB.First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	if userRole.(models.UserRole) != models.RoleAdmin && projet.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var etape models.ProjectUpdate
	if err := config.DB.Where("id = ? AND project_id = ?", idEtape, id).First(&etape).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Étape introuvable"})
		return
	}

	var req struct {
		ImageURL     string `json:"image_url"`
		Comment      string `json:"comment"`
		Description  string `json:"description"`
		BeforeImages string `json:"before_images"`
		AfterImages  string `json:"after_images"`
		Tags         string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&etape).Updates(map[string]interface{}{
		"image_url":     req.ImageURL,
		"comment":       req.Comment,
		"description":   req.Description,
		"before_images": req.BeforeImages,
		"after_images":  req.AfterImages,
		"tags":          req.Tags,
	})
	c.JSON(http.StatusOK, etape)
}

func SupprimerMiseAJour(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idEtape, _ := strconv.Atoi(c.Param("updateId"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var projet models.Project
	if err := config.DB.First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	if userRole.(models.UserRole) != models.RoleAdmin && projet.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Where("id = ? AND project_id = ?", idEtape, id).Delete(&models.ProjectUpdate{})
	c.JSON(http.StatusOK, gin.H{"message": "Avancée supprimée"})
}

func ModifierProjet(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var projet models.Project
	if err := config.DB.First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && projet.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var modifications map[string]interface{}
	if err := c.ShouldBindJSON(&modifications); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&projet).Updates(modifications)
	c.JSON(http.StatusOK, projet)
}

func SupprimerProjet(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var projet models.Project
	if err := config.DB.First(&projet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && projet.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&projet)
	c.JSON(http.StatusOK, gin.H{"message": "Projet supprimé"})
}

