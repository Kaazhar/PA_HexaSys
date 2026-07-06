package handlers

import (
	"log"
	"net/http"
	"os"
	"time"

	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/middleware"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RequeteInscription struct {
	Email     string          `json:"email" binding:"required,email"`
	Password  string          `json:"password" binding:"required,min=6"`
	Firstname string          `json:"firstname" binding:"required"`
	Lastname  string          `json:"lastname" binding:"required"`
	Role      models.UserRole `json:"role"`
}

type RequeteConnexion struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func genererToken(utilisateur models.User) (string, error) {
	claims := middleware.Claims{
		UserID: utilisateur.ID,
		Email:  utilisateur.Email,
		Role:   utilisateur.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	jeton := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return jeton.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func Inscrire(c *gin.Context) {
	var req RequeteInscription
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if interdit, mot := services.ContientMotInterdit(req.Firstname, req.Lastname); interdit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Votre profil contient un terme interdit : '" + mot + "'. Merci de le retirer."})
		return
	}

	var existant models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existant).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Cet email est déjà utilisé"})
		return
	}
	config.DB.Unscoped().Where("email = ? AND deleted_at IS NOT NULL", req.Email).Delete(&models.User{})

	hashMdp, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du chiffrement"})
		return
	}

	role := req.Role
	if role == "" {
		role = models.RoleParticulier
	}
	if role != models.RoleParticulier && role != models.RoleProfessionnel {
		role = models.RoleParticulier
	}

	utilisateur := models.User{
		Email:        req.Email,
		PasswordHash: string(hashMdp),
		Firstname:    req.Firstname,
		Lastname:     req.Lastname,
		Role:         role,
		IsActive:     true,
		IsVerified:   false,
		FirstLogin:   true,
	}

	if err := config.DB.Create(&utilisateur).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création du compte"})
		return
	}

	scoreInitial := models.UpcyclingScore{UserID: utilisateur.ID}
	config.DB.Create(&scoreInitial)

	codeVerification := config.GenerateCode()
	config.DB.Model(&utilisateur).Update("email_verify_token", codeVerification)
	go func() {
		if err := config.SendEmail(utilisateur.Email, "Votre code de confirmation - UpcycleConnect", emailConfirmTemplate(utilisateur.Firstname, codeVerification)); err != nil {
			log.Printf("[EMAIL ERROR] %v", err)
		}
	}()

	jeton, err := genererToken(utilisateur)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la génération du token"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": jeton, "user": utilisateur})
}

func Connexion(c *gin.Context) {
	var req RequeteConnexion
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var utilisateur models.User
	if err := config.DB.Where("email = ?", req.Email).First(&utilisateur).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Identifiants incorrects"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur base de données"})
		}
		return
	}

	if !utilisateur.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Ce compte est désactivé"})
		return
	}

	if utilisateur.IsBanned {
		c.JSON(http.StatusForbidden, gin.H{
			"error":          "banned",
			"ban_reason":     utilisateur.BanReason,
			"ban_expires_at": utilisateur.BanExpiresAt,
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(utilisateur.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identifiants incorrects"})
		return
	}

	if utilisateur.FirstLogin {
		config.DB.Model(&utilisateur).Update("first_login", false)
		utilisateur.FirstLogin = false
	}

	if utilisateur.EmailTwoFAEnabled {
		if err := services.EnvoyerCodeEmail(utilisateur.ID, utilisateur.Email, "email_two_fa", config.SendEmail, email2FATemplate, utilisateur.Firstname); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible d'envoyer le code email"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa":  true,
			"user_id":       utilisateur.ID,
			"two_fa_method": "email",
		})
		return
	}

	if utilisateur.TwoFAEnabled {
		if err := services.EnvoyerCodeVerification(utilisateur.ID, utilisateur.Phone, "two_fa"); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible d'envoyer le code SMS"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"requires_2fa":  true,
			"user_id":       utilisateur.ID,
			"two_fa_method": "sms",
		})
		return
	}

	jeton, err := genererToken(utilisateur)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la génération du token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": jeton,
		"user":  utilisateur,
	})
}

func Verifier2FA(c *gin.Context) {
	var req struct {
		UserID uint   `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id et code requis"})
		return
	}

	var utilisateur models.User
	if err := config.DB.First(&utilisateur, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}
	objectif := "two_fa"
	if utilisateur.EmailTwoFAEnabled {
		objectif = "email_two_fa"
	}

	if err := services.ValiderCode(req.UserID, req.Code, objectif); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	jeton, err := genererToken(utilisateur)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la génération du token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": jeton,
		"user":  utilisateur,
	})
}

func BasculerEmail2FA(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)
	config.DB.Model(&utilisateur).Update("email_two_fa_enabled", req.Enabled)
	config.DB.First(&utilisateur, idUtilisateur)
	msg := "2FA email désactivée"
	if req.Enabled {
		msg = "2FA email activée"
	}
	c.JSON(http.StatusOK, gin.H{"message": msg, "user": utilisateur})
}

func RenvoyerCode2FA(c *gin.Context) {
	var req struct {
		UserID uint `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id requis"})
		return
	}

	var utilisateur models.User
	if err := config.DB.First(&utilisateur, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if utilisateur.EmailTwoFAEnabled {
		if err := services.EnvoyerCodeEmail(utilisateur.ID, utilisateur.Email, "email_two_fa", config.SendEmail, email2FATemplate, utilisateur.Firstname); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Nouveau code envoyé par email"})
		return
	}

	if !utilisateur.TwoFAEnabled || !utilisateur.PhoneVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La 2FA n'est pas activée pour ce compte"})
		return
	}

	if err := services.EnvoyerCodeVerification(utilisateur.ID, utilisateur.Phone, "two_fa"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nouveau code envoyé par SMS"})
}

func MonProfil(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var utilisateur models.User
	if err := config.DB.First(&utilisateur, idUtilisateur).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}
	c.JSON(http.StatusOK, utilisateur)
}

type RequeteModificationProfil struct {
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
}

func ModifierBanniere(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req struct {
		BannerURL   string `json:"banner_url"`
		BannerColor string `json:"banner_color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)
	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"banner_url":   req.BannerURL,
		"banner_color": req.BannerColor,
	})
	config.DB.First(&utilisateur, idUtilisateur)
	c.JSON(http.StatusOK, utilisateur)
}

func ModifierAvatar(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)
	config.DB.Model(&utilisateur).Update("avatar_url", req.AvatarURL)
	config.DB.First(&utilisateur, idUtilisateur)
	c.JSON(http.StatusOK, utilisateur)
}

func ModifierProfil(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req RequeteModificationProfil
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if interdit, mot := services.ContientMotInterdit(req.Firstname, req.Lastname, req.Address); interdit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Votre profil contient un terme interdit : '" + mot + "'. Merci de le retirer."})
		return
	}

	modifications := map[string]interface{}{}
	if req.Firstname != "" {
		modifications["firstname"] = req.Firstname
	}
	if req.Lastname != "" {
		modifications["lastname"] = req.Lastname
	}
	modifications["phone"] = req.Phone
	modifications["address"] = req.Address

	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)
	config.DB.Model(&utilisateur).Updates(modifications)
	config.DB.First(&utilisateur, idUtilisateur)

	c.JSON(http.StatusOK, utilisateur)
}

type RequeteChangementMotDePasse struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

func ChangerMotDePasse(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req RequeteChangementMotDePasse
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var utilisateur models.User
	if err := config.DB.First(&utilisateur, idUtilisateur).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(utilisateur.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Mot de passe actuel incorrect"})
		return
	}

	hashMdp, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du chiffrement"})
		return
	}

	config.DB.Model(&utilisateur).Update("password_hash", string(hashMdp))
	c.JSON(http.StatusOK, gin.H{"message": "Mot de passe mis à jour"})
}

func ConfirmerEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email et code requis"})
		return
	}
	var utilisateur models.User
	if err := config.DB.Where("email = ? AND email_verify_token = ?", req.Email, req.Code).First(&utilisateur).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code invalide ou déjà utilisé"})
		return
	}
	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"is_verified":        true,
		"email_verify_token": "",
	})
	utilisateur.IsVerified = true
	utilisateur.EmailVerifyToken = ""
	jeton, err := genererToken(utilisateur)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": jeton, "user": utilisateur})
}

func MotDePasseOublie(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Si cet email est enregistré, vous recevrez un lien de réinitialisation."})

	var utilisateur models.User
	if err := config.DB.Where("email = ?", req.Email).First(&utilisateur).Error; err != nil {
		return
	}
	jeton := config.GenerateToken()
	expiration := time.Now().Add(1 * time.Hour)
	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"password_reset_token":  jeton,
		"password_reset_expiry": expiration,
	})
	appURL := config.GetEnv("APP_URL", "http://localhost:5173")
	lien := appURL + "/reinitialiser-mot-de-passe?token=" + jeton
	go config.SendEmail(utilisateur.Email, "Réinitialisation de votre mot de passe - UpcycleConnect", emailResetPasswordTemplate(utilisateur.Firstname, lien))
}

func RenvoyerConfirmationEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Si cet email est enregistré et non vérifié, un nouveau code vous a été envoyé."})

	var utilisateur models.User
	if err := config.DB.Where("email = ? AND is_verified = ?", req.Email, false).First(&utilisateur).Error; err != nil {
		return
	}
	codeVerification := config.GenerateCode()
	config.DB.Model(&utilisateur).Update("email_verify_token", codeVerification)
	go func() {
		if err := config.SendEmail(utilisateur.Email, "Nouveau code de confirmation - UpcycleConnect", emailConfirmTemplate(utilisateur.Firstname, codeVerification)); err != nil {
			log.Printf("[EMAIL ERROR] %v", err)
		}
	}()
}

func ReinitialiserMotDePasse(c *gin.Context) {
	var req struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var utilisateur models.User
	if err := config.DB.Where("password_reset_token = ? AND password_reset_expiry > ?", req.Token, time.Now()).First(&utilisateur).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token invalide ou expiré"})
		return
	}
	hashMdp, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"password_hash":         string(hashMdp),
		"password_reset_token":  "",
		"password_reset_expiry": nil,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Mot de passe réinitialisé avec succès"})
}
