package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func ListerUtilisateurs(c *gin.Context) {
	var utilisateurs []models.User
	q := config.DB.Model(&models.User{})

	if role := c.Query("role"); role != "" {
		q = q.Where("role = ?", role)
	}
	if statut := c.Query("status"); statut == "active" {
		q = q.Where("is_active = ?", true)
	} else if statut == "inactive" {
		q = q.Where("is_active = ?", false)
	}
	if recherche := c.Query("search"); recherche != "" {
		q = q.Where("firstname LIKE ? OR lastname LIKE ? OR email LIKE ?",
			"%"+recherche+"%", "%"+recherche+"%", "%"+recherche+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var total int64
	q.Count(&total)

	q.Offset(decalage).Limit(limite).Order("created_at DESC").Find(&utilisateurs)

	c.JSON(http.StatusOK, gin.H{
		"users": utilisateurs,
		"total": total,
		"page":  page,
		"limit": limite,
	})
}

func ProfilPublic(c *gin.Context) {
	id := c.Param("id")
	var utilisateur models.User
	if err := config.DB.Select("id, firstname, lastname, role, created_at, siret_verified").First(&utilisateur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	var annoncesActives []models.Listing
	config.DB.Preload("Category").Where("user_id = ? AND status = ?", id, "active").
		Order("created_at DESC").Limit(12).Find(&annoncesActives)

	var nbAvis int64
	var noteMoyenne float64
	config.DB.Model(&models.Review{}).Where("target_user_id = ?", id).Count(&nbAvis)
	if nbAvis > 0 {
		config.DB.Model(&models.Review{}).Where("target_user_id = ?", id).Select("AVG(rating)").Scan(&noteMoyenne)
	}

	var scoreUpcycling models.UpcyclingScore
	config.DB.Where("user_id = ?", id).First(&scoreUpcycling)

	c.JSON(http.StatusOK, gin.H{
		"user":            utilisateur,
		"active_listings": annoncesActives,
		"review_count":    nbAvis,
		"avg_rating":      noteMoyenne,
		"score":           scoreUpcycling,
	})
}


type RequeteModificationUtilisateur struct {
	Firstname string          `json:"firstname"`
	Lastname  string          `json:"lastname"`
	Email     string          `json:"email"`
	Role      models.UserRole `json:"role"`
	IsActive  *bool           `json:"is_active"`
	Phone     string          `json:"phone"`
	Address   string          `json:"address"`
}

func ModifierUtilisateur(c *gin.Context) {
	id := c.Param("id")
	var utilisateur models.User
	if err := config.DB.First(&utilisateur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	var req RequeteModificationUtilisateur
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	modifications := map[string]interface{}{}
	if req.Firstname != "" {
		modifications["firstname"] = req.Firstname
	}
	if req.Lastname != "" {
		modifications["lastname"] = req.Lastname
	}
	if req.Email != "" {
		modifications["email"] = req.Email
	}
	if req.Role != "" {
		modifications["role"] = req.Role
	}
	if req.IsActive != nil {
		modifications["is_active"] = *req.IsActive
	}
	if req.Phone != "" {
		modifications["phone"] = req.Phone
	}
	if req.Address != "" {
		modifications["address"] = req.Address
	}

	if err := config.DB.Model(&utilisateur).Updates(modifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la modification"})
		return
	}

	config.DB.First(&utilisateur, id)
	c.JSON(http.StatusOK, utilisateur)
}

func SupprimerUtilisateur(c *gin.Context) {
	id := c.Param("id")
	var utilisateur models.User
	if err := config.DB.First(&utilisateur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if err := config.DB.Delete(&utilisateur).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la suppression"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Utilisateur supprimé"})
}

type RequeteCreationUtilisateur struct {
	Email      string          `json:"email" binding:"required,email"`
	Password   string          `json:"password" binding:"required,min=6"`
	Firstname  string          `json:"firstname" binding:"required"`
	Lastname   string          `json:"lastname" binding:"required"`
	Role       models.UserRole `json:"role"`
	IsVerified bool            `json:"is_verified"`
}

func CreerUtilisateur(c *gin.Context) {
	var req RequeteCreationUtilisateur
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existant models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existant).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email déjà utilisé"})
		return
	}

	hashMdp, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du hachage du mot de passe"})
		return
	}

	role := req.Role
	if role == "" {
		role = models.RoleParticulier
	}

	utilisateur := models.User{
		Email:        req.Email,
		PasswordHash: string(hashMdp),
		Firstname:    req.Firstname,
		Lastname:     req.Lastname,
		Role:         role,
		IsActive:     true,
		IsVerified:   req.IsVerified,
	}

	if err := config.DB.Create(&utilisateur).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création"})
		return
	}

	config.DB.Create(&models.UpcyclingScore{UserID: utilisateur.ID})

	c.JSON(http.StatusCreated, utilisateur)
}

func ReinitialiserEmail2FA(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID invalide"})
		return
	}
	var utilisateur models.User
	if err := config.DB.First(&utilisateur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}
	config.DB.Model(&utilisateur).Update("email_two_fa_enabled", false)
	c.JSON(http.StatusOK, gin.H{"message": "2FA email réinitialisée"})
}
