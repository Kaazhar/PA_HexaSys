package config

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
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
	apiKey := GetEnv("MAILTRAP_API_TOKEN", "")

	if apiKey == "" {
		fmt.Printf("[EMAIL DEV] To: %s | Subject: %s\n", to, subject)
		return nil
	}

	fromEmail := GetEnv("MAILTRAP_FROM_EMAIL", "hello@demomailtrap.co")
	fromName := GetEnv("MAILTRAP_FROM_NAME", "UpcycleConnect")

	payload := map[string]interface{}{
		"from":    map[string]string{"email": fromEmail, "name": fromName},
		"to":      []map[string]string{{"email": to}},
		"subject": subject,
		"html":    htmlBody,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://send.api.mailtrap.io/api/send", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("mailtrap API error: status %d", resp.StatusCode)
	}
	return nil
}
