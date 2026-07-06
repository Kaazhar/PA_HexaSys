package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func TeleverserFichier(c *gin.Context) {
	fichier, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aucun fichier fourni"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fichier.Filename))
	extensionsOk := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !extensionsOk[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format de fichier non supporté"})
		return
	}

	if fichier.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fichier trop volumineux (max 5MB)"})
		return
	}

	nomFichier := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	cheminFichier := filepath.Join("uploads", nomFichier)

	if err := c.SaveUploadedFile(fichier, cheminFichier); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la sauvegarde"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": "/uploads/" + nomFichier})
}
