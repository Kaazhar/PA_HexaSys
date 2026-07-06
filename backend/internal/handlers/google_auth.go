package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func ConfigGoogle(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"client_id": os.Getenv("GOOGLE_CLIENT_ID")})
}

type googleTokenInfo struct {
	Aud           string `json:"aud"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Sub           string `json:"sub"`
}

func verifierTokenGoogle(credential string) (*googleTokenInfo, error) {
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(credential))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("token rejeté par Google")
	}

	var info googleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

func ConnexionGoogle(c *gin.Context) {
	var req struct {
		Credential string `json:"credential" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token Google manquant"})
		return
	}

	info, err := verifierTokenGoogle(req.Credential)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token Google invalide"})
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" || info.Aud != clientID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token Google non destiné à cette application"})
		return
	}
	if info.Email == "" || info.EmailVerified != "true" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email Google non vérifié"})
		return
	}

	var utilisateur models.User
	err = config.DB.Where("email = ?", info.Email).First(&utilisateur).Error

	if err != nil {
		hashAlea, _ := bcrypt.GenerateFromPassword([]byte(config.GenerateToken()), bcrypt.DefaultCost)
		utilisateur = models.User{
			Email:        info.Email,
			PasswordHash: string(hashAlea),
			Firstname:    info.GivenName,
			Lastname:     info.FamilyName,
			Role:         models.RoleParticulier,
			IsActive:     true,
			IsVerified:   true,
			FirstLogin:   false,
			AvatarURL:    info.Picture,
		}
		if err := config.DB.Create(&utilisateur).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de créer le compte"})
			return
		}
		config.DB.Create(&models.UpcyclingScore{UserID: utilisateur.ID})
	}

	if !utilisateur.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Compte désactivé"})
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

	jeton, err := genererToken(utilisateur)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la génération du token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": jeton, "user": utilisateur})
}
