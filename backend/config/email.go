package config

import (
	"crypto/rand"
	"crypto/tls"
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
	port := "465"
	addr := host + ":" + port

	msg := "From: UpcycleConnect <" + gmailUser + ">\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n" +
		"\r\n" +
		htmlBody

	auth := smtp.PlainAuth("", gmailUser, gmailPassword, host)

	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         host,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("smtp dial error: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("smtp client error: %w", err)
	}
	defer client.Close()

	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth error: %w", err)
	}
	if err = client.Mail(gmailUser); err != nil {
		return fmt.Errorf("smtp mail error: %w", err)
	}
	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt error: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data error: %w", err)
	}
	defer w.Close()

	if _, err = fmt.Fprint(w, msg); err != nil {
		return fmt.Errorf("smtp write error: %w", err)
	}

	return nil
}
