package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetProjects(c *gin.Context) {
	var projects []models.Project
	query := config.DB.Preload("User")
	if search := c.Query("search"); search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	query.Order("created_at DESC").Find(&projects)
	c.JSON(http.StatusOK, projects)
}

func GetMyProjects(c *gin.Context) {
	userID, _ := c.Get("userID")
	var projects []models.Project
	config.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&projects)
	c.JSON(http.StatusOK, projects)
}

func CreateProject(c *gin.Context) {
	userID, _ := c.Get("userID")
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

	project := models.Project{
		Title:        req.Title,
		Description:  req.Description,
		BeforeImages: req.BeforeImages,
		AfterImages:  req.AfterImages,
		Tags:         req.Tags,
		UserID:       userID.(uint),
	}
	if err := config.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur création"})
		return
	}
	ensureProjectForumTopic(&project)
	c.JSON(http.StatusCreated, project)
}

// ensureProjectForumTopic crée le topic forum de l'espace communautaire si absent.
func ensureProjectForumTopic(project *models.Project) uint {
	var topic models.ForumTopic
	if err := config.DB.Where("project_id = ?", project.ID).First(&topic).Error; err == nil {
		return topic.ID
	}
	topic = models.ForumTopic{
		Title:     "Projet : " + project.Title,
		Content:   "Espace communautaire du projet \"" + project.Title + "\". Réservé aux abonnés.",
		AuthorID:  project.UserID,
		ProjectID: &project.ID,
	}
	config.DB.Create(&topic)
	return topic.ID
}

// notifyProjectFollowers envoie une notification à tous les suiveurs d'un projet.
func notifyProjectFollowers(projectID uint, message string) {
	var followers []models.ProjectFollower
	config.DB.Where("project_id = ?", projectID).Find(&followers)
	for _, f := range followers {
		config.DB.Create(&models.Notification{
			UserID:  f.UserID,
			Message: message,
			Type:    "info",
		})
	}
}

// GetProject renvoie un projet, ses avancées, l'état de suivi et l'espace communautaire.
func GetProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var project models.Project
	if err := config.DB.Preload("User").First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}

	var updates []models.ProjectUpdate
	config.DB.Where("project_id = ?", id).Order("created_at ASC").Find(&updates)

	var followersCount int64
	config.DB.Model(&models.ProjectFollower{}).Where("project_id = ?", id).Count(&followersCount)

	isFollowing := false
	if userID, ok := c.Get("userID"); ok {
		var count int64
		config.DB.Model(&models.ProjectFollower{}).Where("project_id = ? AND user_id = ?", id, userID).Count(&count)
		isFollowing = count > 0
	}

	forumTopicID := ensureProjectForumTopic(&project)

	c.JSON(http.StatusOK, gin.H{
		"project":         project,
		"updates":         updates,
		"followers_count": followersCount,
		"is_following":    isFollowing,
		"forum_topic_id":  forumTopicID,
	})
}

// FollowProject : un utilisateur s'abonne au projet.
func FollowProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}

	var existing models.ProjectFollower
	if err := config.DB.Where("project_id = ? AND user_id = ?", id, userID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Déjà abonné"})
		return
	}

	config.DB.Create(&models.ProjectFollower{ProjectID: uint(id), UserID: userID.(uint)})
	c.JSON(http.StatusOK, gin.H{"message": "Abonné au projet"})
}

// UnfollowProject : se désabonner.
func UnfollowProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	config.DB.Where("project_id = ? AND user_id = ?", id, userID).Delete(&models.ProjectFollower{})
	c.JSON(http.StatusOK, gin.H{"message": "Désabonné du projet"})
}

// AddProjectUpdate : le créateur ajoute une avancée (image + commentaire) et notifie les suiveurs.
func AddProjectUpdate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	if userRole.(models.UserRole) != models.RoleAdmin && project.UserID != userID.(uint) {
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

	update := models.ProjectUpdate{
		ProjectID:    uint(id),
		ImageURL:     req.ImageURL,
		Comment:      req.Comment,
		Description:  req.Description,
		BeforeImages: req.BeforeImages,
		AfterImages:  req.AfterImages,
		Tags:         req.Tags,
	}
	config.DB.Create(&update)

	notifyProjectFollowers(uint(id), "Nouvelle étape sur le projet \""+project.Title+"\"")
	c.JSON(http.StatusCreated, update)
}

// UpdateProjectUpdate : le créateur (ou un admin) modifie une étape existante.
func UpdateProjectUpdate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	updateID, _ := strconv.Atoi(c.Param("updateId"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	if userRole.(models.UserRole) != models.RoleAdmin && project.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var update models.ProjectUpdate
	if err := config.DB.Where("id = ? AND project_id = ?", updateID, id).First(&update).Error; err != nil {
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

	config.DB.Model(&update).Updates(map[string]interface{}{
		"image_url":     req.ImageURL,
		"comment":       req.Comment,
		"description":   req.Description,
		"before_images": req.BeforeImages,
		"after_images":  req.AfterImages,
		"tags":          req.Tags,
	})
	c.JSON(http.StatusOK, update)
}

// DeleteProjectUpdate : le créateur supprime une avancée.
func DeleteProjectUpdate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	updateID, _ := strconv.Atoi(c.Param("updateId"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	if userRole.(models.UserRole) != models.RoleAdmin && project.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Where("id = ? AND project_id = ?", updateID, id).Delete(&models.ProjectUpdate{})
	c.JSON(http.StatusOK, gin.H{"message": "Avancée supprimée"})
}

func UpdateProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && project.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&project).Updates(req)
	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && project.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&project)
	c.JSON(http.StatusOK, gin.H{"message": "Projet supprimé"})
}

