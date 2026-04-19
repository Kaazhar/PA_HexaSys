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

type RegisterRequest struct {
	Email     string          `json:"email" binding:"required,email"`
	Password  string          `json:"password" binding:"required,min=6"`
	Firstname string          `json:"firstname" binding:"required"`
	Lastname  string          `json:"lastname" binding:"required"`
	Role      models.UserRole `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func generateToken(user models.User) (string, error) {
	claims := middleware.Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}
	config.DB.Unscoped().Where("email = ? AND deleted_at IS NOT NULL", req.Email).Delete(&models.User{})

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	role := req.Role
	if role == "" {
		role = models.RoleParticulier
	}
	if role != models.RoleParticulier && role != models.RoleProfessionnel {
		role = models.RoleParticulier
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Firstname:    req.Firstname,
		Lastname:     req.Lastname,
		Role:         role,
		IsActive:     true,
		IsVerified:   false,
		FirstLogin:   true,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	score := models.UpcyclingScore{UserID: user.ID}
	config.DB.Create(&score)

	verifyCode := config.GenerateCode()
	config.DB.Model(&user).Update("email_verify_token", verifyCode)
	go func() {
		if err := config.SendEmail(user.Email, "Votre code de confirmation - UpcycleConnect", emailConfirmTemplate(user.Firstname, verifyCode)); err != nil {
			log.Printf("[EMAIL ERROR] %v", err)
		}
	}()

	token, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": token, "user": user})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is disabled"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if user.FirstLogin {
		config.DB.Model(&user).Update("first_login", false)
		user.FirstLogin = false
	}

	if user.TwoFAEnabled {
		err := services.EnvoyerCodeVerification(user.ID, user.Phone, "two_fa")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible d'envoyer le code SMS"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"requires_2fa": true,
			"user_id":      user.ID,
		})
		return
	}

	token, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func Verify2FA(c *gin.Context) {
	var req struct {
		UserID uint   `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id et code requis"})
		return
	}

	if err := services.ValiderCode(req.UserID, req.Code, "two_fa"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	token, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la génération du token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func Resend2FACode(c *gin.Context) {
	var req struct {
		UserID uint `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id requis"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if !user.TwoFAEnabled || !user.PhoneVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La 2FA n'est pas activée pour ce compte"})
		return
	}

	if err := services.EnvoyerCodeVerification(user.ID, user.Phone, "two_fa"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nouveau code envoyé par SMS"})
}

func Me(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

type UpdateProfileRequest struct {
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
}

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Firstname != "" {
		updates["firstname"] = req.Firstname
	}
	if req.Lastname != "" {
		updates["lastname"] = req.Lastname
	}
	updates["phone"] = req.Phone
	updates["address"] = req.Address

	var user models.User
	config.DB.First(&user, userID)
	config.DB.Model(&user).Updates(updates)
	config.DB.First(&user, userID)

	c.JSON(http.StatusOK, user)
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

func ChangePassword(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Mot de passe actuel incorrect"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors du chiffrement"})
		return
	}

	config.DB.Model(&user).Update("password_hash", string(hash))
	c.JSON(http.StatusOK, gin.H{"message": "Mot de passe mis à jour"})
}

func ConfirmEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email et code requis"})
		return
	}
	var user models.User
	if err := config.DB.Where("email = ? AND email_verify_token = ?", req.Email, req.Code).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code invalide ou déjà utilisé"})
		return
	}
	config.DB.Model(&user).Updates(map[string]interface{}{
		"is_verified":        true,
		"email_verify_token": "",
	})
	user.IsVerified = true
	user.EmailVerifyToken = ""
	token, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur serveur"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

func ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Si cet email est enregistré, vous recevrez un lien de réinitialisation."})

	var user models.User
	if err := config.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return
	}
	token := config.GenerateToken()
	expiry := time.Now().Add(1 * time.Hour)
	config.DB.Model(&user).Updates(map[string]interface{}{
		"password_reset_token":  token,
		"password_reset_expiry": expiry,
	})
	appURL := config.GetEnv("APP_URL", "http://localhost:5173")
	link := appURL + "/reinitialiser-mot-de-passe?token=" + token
	go config.SendEmail(user.Email, "Réinitialisation de votre mot de passe - UpcycleConnect", emailResetPasswordTemplate(user.Firstname, link))
}

func ResendConfirmEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Si cet email est enregistré et non vérifié, un nouveau code vous a été envoyé."})

	var user models.User
	if err := config.DB.Where("email = ? AND is_verified = ?", req.Email, false).First(&user).Error; err != nil {
		return
	}
	verifyCode := config.GenerateCode()
	config.DB.Model(&user).Update("email_verify_token", verifyCode)
	go func() {
		if err := config.SendEmail(user.Email, "Nouveau code de confirmation - UpcycleConnect", emailConfirmTemplate(user.Firstname, verifyCode)); err != nil {
			log.Printf("[EMAIL ERROR] %v", err)
		}
	}()
}

func ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var user models.User
	if err := config.DB.Where("password_reset_token = ? AND password_reset_expiry > ?", req.Token, time.Now()).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token invalide ou expiré"})
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	config.DB.Model(&user).Updates(map[string]interface{}{
		"password_hash":         string(hash),
		"password_reset_token":  "",
		"password_reset_expiry": nil,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Mot de passe réinitialisé avec succès"})
}
