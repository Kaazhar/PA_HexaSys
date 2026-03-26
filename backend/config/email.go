package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/smtp"
)

func GenerateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GenerateCode() string {
	b := make([]byte, 3)
	rand.Read(b)
	code := (int(b[0])<<16 | int(b[1])<<8 | int(b[2])) % 1000000
	return fmt.Sprintf("%06d", code)
}

func SendEmail(to, subject, htmlBody string) error {
	gmailUser := GetEnv("GMAIL_USER", "")
	gmailPassword := GetEnv("GMAIL_APP_PASSWORD", "")

	if gmailUser == "" || gmailPassword == "" {
		fmt.Printf("[EMAIL DEV] To: %s | Subject: %s\n", to, subject)
		return nil
	}

	host := "smtp.gmail.com"
	addr := host + ":587"

	msg := []byte("From: UpcycleConnect <" + gmailUser + ">\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" +
		htmlBody)

	auth := smtp.PlainAuth("", gmailUser, gmailPassword, host)

	if err := smtp.SendMail(addr, auth, gmailUser, []string{to}, msg); err != nil {
		return fmt.Errorf("smtp error: %w", err)
	}
	return nil
}
