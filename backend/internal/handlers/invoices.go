package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-pdf/fpdf"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func creerOuObtenirFacture(numero string, idUtilisateur uint, typeFacture, description string, montant float64) models.Invoice {
	var facture models.Invoice
	if config.DB.Where("number = ?", numero).First(&facture).Error == nil {
		return facture
	}

	tva := montant * 0.20
	facture = models.Invoice{
		Number:      numero,
		UserID:      idUtilisateur,
		Type:        typeFacture,
		Description: description,
		Amount:      montant,
		Tax:         tva,
		Total:       montant + tva,
		Status:      "paid",
	}
	config.DB.Create(&facture)
	return facture
}

func MesFactures(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var factures []models.Invoice
	config.DB.Where("user_id = ?", idUtilisateur).Order("created_at DESC").Find(&factures)
	c.JSON(http.StatusOK, factures)
}

func TelechargerFacturePDF(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	id := c.Param("id")
	var facture models.Invoice
	if err := config.DB.Preload("User").First(&facture, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Facture introuvable"})
		return
	}

	if facture.UserID != idUtilisateur.(uint) && role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cette facture ne vous appartient pas"})
		return
	}

	contenuPDF, err := genererPDF(facture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le PDF"})
		return
	}

	nomFichier := fmt.Sprintf("facture-%s.pdf", facture.Number)
	c.Header("Content-Disposition", "attachment; filename="+nomFichier)
	c.Data(http.StatusOK, "application/pdf", contenuPDF)
}

func genererPDF(inv models.Invoice) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()
	tr := pdf.UnicodeTranslatorFromDescriptor("")

	pdf.SetFont("Helvetica", "B", 22)
	pdf.SetTextColor(45, 80, 22)
	pdf.Cell(0, 12, tr("UpcycleConnect"))
	pdf.Ln(10)

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetTextColor(120, 120, 120)
	pdf.Cell(0, 5, tr("Plateforme d'upcycling et de réemploi"))
	pdf.Ln(15)

	pdf.SetFont("Helvetica", "B", 16)
	pdf.SetTextColor(30, 30, 30)
	pdf.Cell(0, 10, tr("FACTURE N° "+inv.Number))
	pdf.Ln(8)

	pdf.SetFont("Helvetica", "", 11)
	pdf.SetTextColor(80, 80, 80)
	pdf.Cell(0, 6, tr("Date : "+inv.CreatedAt.Format("02/01/2006")))
	pdf.Ln(6)
	pdf.Cell(0, 6, tr("Statut : "+statutFacture(inv.Status)))
	pdf.Ln(14)

	pdf.SetFont("Helvetica", "B", 11)
	pdf.SetTextColor(30, 30, 30)
	pdf.Cell(0, 6, tr("Facturé à"))
	pdf.Ln(7)
	pdf.SetFont("Helvetica", "", 11)
	pdf.SetTextColor(80, 80, 80)
	pdf.Cell(0, 6, tr(inv.User.Firstname+" "+inv.User.Lastname))
	pdf.Ln(6)
	pdf.Cell(0, 6, tr(inv.User.Email))
	pdf.Ln(16)

	pdf.SetFillColor(45, 80, 22)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(120, 9, tr("Désignation"), "", 0, "L", true, 0, "")
	pdf.CellFormat(50, 9, tr("Montant HT"), "", 1, "R", true, 0, "")

	pdf.SetTextColor(50, 50, 50)
	pdf.SetFont("Helvetica", "", 11)
	pdf.CellFormat(120, 9, tr(libelleFacture(inv)), "B", 0, "L", false, 0, "")
	pdf.CellFormat(50, 9, tr(formatEuro(inv.Amount)), "B", 1, "R", false, 0, "")

	pdf.Ln(8)
	pdf.SetX(110)
	pdf.SetFont("Helvetica", "", 11)
	pdf.CellFormat(40, 8, tr("Total HT"), "", 0, "R", false, 0, "")
	pdf.CellFormat(30, 8, tr(formatEuro(inv.Amount)), "", 1, "R", false, 0, "")
	pdf.SetX(110)
	pdf.CellFormat(40, 8, tr("TVA (20%)"), "", 0, "R", false, 0, "")
	pdf.CellFormat(30, 8, tr(formatEuro(inv.Tax)), "", 1, "R", false, 0, "")
	pdf.SetX(110)
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(45, 80, 22)
	pdf.CellFormat(40, 10, tr("TOTAL TTC"), "T", 0, "R", false, 0, "")
	pdf.CellFormat(30, 10, tr(formatEuro(inv.Total)), "T", 1, "R", false, 0, "")

	pdf.SetY(-25)
	pdf.SetFont("Helvetica", "I", 9)
	pdf.SetTextColor(150, 150, 150)
	pdf.MultiCell(0, 5, tr("Merci pour votre confiance — UpcycleConnect"), "", "C", false)
	pdf.MultiCell(0, 5, tr("Ce document tient lieu de facture."), "", "C", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func libelleFacture(inv models.Invoice) string {
	if inv.Description != "" {
		return inv.Description
	}
	switch inv.Type {
	case "workshop":
		return "Inscription à une formation"
	case "subscription":
		return "Abonnement UpcycleConnect"
	case "listing":
		return "Achat d'une annonce"
	default:
		return "Prestation UpcycleConnect"
	}
}

func statutFacture(status string) string {
	switch status {
	case "paid":
		return "Payée"
	case "pending":
		return "En attente"
	default:
		return status
	}
}

func formatEuro(v float64) string {
	return strconv.FormatFloat(v, 'f', 2, 64) + " EUR"
}
