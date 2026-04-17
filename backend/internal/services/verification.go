package services

import (
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"

	"github.com/nyaruka/phonenumbers"
)

func NormaliserTelephone(numero, regionParDefaut string) (string, error) {
	parsed, err := phonenumbers.Parse(numero, regionParDefaut)
	if err != nil {
		return "", errors.New("numéro de téléphone invalide")
	}

	if !phonenumbers.IsValidNumber(parsed) {
		return "", errors.New("numéro de téléphone invalide")
	}

	return phonenumbers.Format(parsed, phonenumbers.E164), nil
}

func verifierRateLimit(userID uint) error {
	var compteParMinute int64
	config.DB.Model(&models.PhoneVerification{}).
		Where("user_id = ? AND created_at > ?", userID, time.Now().Add(-1*time.Minute)).
		Count(&compteParMinute)

	if compteParMinute >= 1 {
		return errors.New("vous devez attendre 1 minute avant de renvoyer un code")
	}

	var compteParHeure int64
	config.DB.Model(&models.PhoneVerification{}).
		Where("user_id = ? AND created_at > ?", userID, time.Now().Add(-1*time.Hour)).
		Count(&compteParHeure)

	if compteParHeure >= 5 {
		return errors.New("vous avez dépassé la limite de 5 SMS par heure, réessayez plus tard")
	}

	return nil
}

func EnvoyerCodeVerification(userID uint, telephone, purpose string) error {
	telNormalise, err := NormaliserTelephone(telephone, "FR")
	if err != nil {
		return err
	}

	if err := verifierRateLimit(userID); err != nil {
		return err
	}

	code := config.GenerateCode()

	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("erreur de chiffrement : %w", err)
	}

	verification := models.PhoneVerification{
		UserID:    userID,
		Phone:     telNormalise,
		CodeHash:  string(codeHash),
		Purpose:   purpose,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	if err := config.DB.Create(&verification).Error; err != nil {
		return fmt.Errorf("erreur base de données : %w", err)
	}

	message := fmt.Sprintf("Votre code UpcycleConnect : %s\nValable 10 minutes.", code)
	if err := EnvoyerSMS(telNormalise, message); err != nil {
		return fmt.Errorf("erreur envoi SMS : %w", err)
	}

	return nil
}

func ValiderCode(userID uint, codeSaisi, purpose string) error {
	var verification models.PhoneVerification
	err := config.DB.
		Where("user_id = ? AND purpose = ? AND used = false AND expires_at > ?",
			userID, purpose, time.Now()).
		Order("created_at DESC").
		First(&verification).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("aucun code valide trouvé, demandez un nouveau code")
		}
		return fmt.Errorf("erreur base de données : %w", err)
	}

	if verification.Attempts >= 5 {
		config.DB.Model(&verification).Update("used", true)
		return errors.New("trop de tentatives, demandez un nouveau code")
	}

	err = bcrypt.CompareHashAndPassword([]byte(verification.CodeHash), []byte(codeSaisi))
	if err != nil {
		config.DB.Model(&verification).Update("attempts", verification.Attempts+1)
		restantes := 5 - (verification.Attempts + 1)
		return fmt.Errorf("code incorrect, %d tentative(s) restante(s)", restantes)
	}

	config.DB.Model(&verification).Update("used", true)
	return nil
}

func RecupererTelephoneDepuisVerification(userID uint, purpose string) (string, error) {
	var verification models.PhoneVerification
	err := config.DB.
		Where("user_id = ? AND purpose = ? AND used = true", userID, purpose).
		Order("updated_at DESC").
		First(&verification).Error

	if err != nil {
		return "", errors.New("aucune vérification trouvée")
	}
	return verification.Phone, nil
}
