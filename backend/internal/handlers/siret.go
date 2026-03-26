package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

type SiretRequest struct {
	Siret string `json:"siret" binding:"required"`
}

type RechercheEntreprisesResponse struct {
	Results []struct {
		Siren                    string  `json:"siren"`
		NomComplet               string  `json:"nom_complet"`
		NomRaisonSociale         string  `json:"nom_raison_sociale"`
		EtatAdministratif        string  `json:"etat_administratif"`
		ActivitePrincipale       string  `json:"activite_principale"`
		CategorieEntreprise      string  `json:"categorie_entreprise"`
		DateCreation             string  `json:"date_creation"`
		NatureJuridique          string  `json:"nature_juridique"`
		TrancheEffectifSalarie   string  `json:"tranche_effectif_salarie"`
		Siege struct {
			Siret             string `json:"siret"`
			EtatAdministratif string `json:"etat_administratif"`
			Adresse           string `json:"adresse"`
			LibelleCommune    string `json:"libelle_commune"`
			CodePostal        string `json:"code_postal"`
		} `json:"siege"`
		MatchingEtablissements []struct {
			Siret             string `json:"siret"`
			EtatAdministratif string `json:"etat_administratif"`
			Adresse           string `json:"adresse"`
			LibelleCommune    string `json:"libelle_commune"`
			CodePostal        string `json:"code_postal"`
		} `json:"matching_etablissements"`
		Finances map[string]struct {
			CA          *int64 `json:"ca"`
			ResultatNet *int64 `json:"resultat_net"`
		} `json:"finances"`
	} `json:"results"`
	TotalResults int `json:"total_results"`
}

var siretRegexp = regexp.MustCompile(`^\d{14}$`)

var trancheEffectifs = map[string]string{
	"00": "0 salarié",
	"01": "1 ou 2 salariés",
	"02": "3 à 5 salariés",
	"03": "6 à 9 salariés",
	"11": "10 à 19 salariés",
	"12": "20 à 49 salariés",
	"21": "50 à 99 salariés",
	"22": "100 à 199 salariés",
	"31": "200 à 249 salariés",
	"32": "250 à 499 salariés",
	"41": "500 à 999 salariés",
	"42": "1 000 à 1 999 salariés",
	"51": "2 000 à 4 999 salariés",
	"52": "5 000 à 9 999 salariés",
	"53": "10 000 salariés et plus",
}

var categorieEntreprise = map[string]string{
	"TPE": "Très petite entreprise (TPE)",
	"PME": "Petite et moyenne entreprise (PME)",
	"ETI": "Entreprise de taille intermédiaire (ETI)",
	"GE":  "Grande entreprise (GE)",
}

func VerifySiret(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req SiretRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !siretRegexp.MatchString(req.Siret) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Le SIRET doit contenir exactement 14 chiffres"})
		return
	}

	url := fmt.Sprintf("https://recherche-entreprises.api.gouv.fr/search?q=%s&page=1&per_page=1", req.Siret)
	httpReq, _ := http.NewRequest("GET", url, nil)
	httpReq.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := (&http.Client{}).Do(httpReq)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Impossible de contacter l'API SIRENE"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Service SIRENE indisponible, réessayez plus tard"})
		return
	}

	body, _ := io.ReadAll(resp.Body)
	var data RechercheEntreprisesResponse
	if err := json.Unmarshal(body, &data); err != nil || data.TotalResults == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SIRET introuvable dans la base SIRENE"})
		return
	}

	company := data.Results[0]

	if company.EtatAdministratif != "A" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette entreprise n'est pas active (fermée ou radiée)"})
		return
	}

	// Trouver l'établissement correspondant au SIRET
	var etabAdresse, etabVille, etabCP string
	etabActif := false
	for _, etab := range company.MatchingEtablissements {
		if etab.Siret == req.Siret {
			if etab.EtatAdministratif == "A" {
				etabActif = true
			}
			etabAdresse = etab.Adresse
			etabVille = etab.LibelleCommune
			etabCP = etab.CodePostal
			break
		}
	}
	if !etabActif && company.Siege.Siret == req.Siret {
		etabActif = company.Siege.EtatAdministratif == "A"
		etabAdresse = company.Siege.Adresse
		etabVille = company.Siege.LibelleCommune
		etabCP = company.Siege.CodePostal
	}
	if !etabActif {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cet établissement n'est pas actif"})
		return
	}

	companyName := company.NomComplet
	if companyName == "" {
		companyName = company.NomRaisonSociale
	}

	// Effectifs lisible
	effectifsLabel := trancheEffectifs[company.TrancheEffectifSalarie]
	if effectifsLabel == "" && company.TrancheEffectifSalarie != "" {
		effectifsLabel = "Tranche " + company.TrancheEffectifSalarie
	}

	// Catégorie lisible
	catLabel := categorieEntreprise[company.CategorieEntreprise]
	if catLabel == "" {
		catLabel = company.CategorieEntreprise
	}

	// Dernier CA connu
	var lastCA *int64
	var lastCAYear string
	for year, fin := range company.Finances {
		if fin.CA != nil && (lastCAYear == "" || year > lastCAYear) {
			lastCA = fin.CA
			lastCAYear = year
		}
	}

	// Enregistrer le SIRET vérifié
	var user models.User
	config.DB.First(&user, userID)
	config.DB.Model(&user).Updates(map[string]interface{}{
		"siret":          req.Siret,
		"siret_verified": true,
	})

	config.DB.Create(&models.Notification{
		UserID:  user.ID,
		Message: fmt.Sprintf("Votre SIRET %s a été vérifié avec succès. Entreprise : %s", req.Siret, companyName),
		Type:    "success",
	})

	result := gin.H{
		"message":          "SIRET vérifié avec succès",
		"siret":            req.Siret,
		"siren":            company.Siren,
		"company_name":     companyName,
		"activity_code":    company.ActivitePrincipale,
		"category":         catLabel,
		"employees":        effectifsLabel,
		"date_creation":    company.DateCreation,
		"address":          etabAdresse,
		"city":             etabVille,
		"postal_code":      etabCP,
		"siret_verified":   true,
	}
	if lastCA != nil {
		result["turnover"] = *lastCA
		result["turnover_year"] = lastCAYear
	}

	c.JSON(http.StatusOK, result)
}

// GetCompanyBySiret retourne les infos d'une entreprise depuis l'API SIRENE (endpoint public).
func GetCompanyBySiret(c *gin.Context) {
	siret := c.Param("siret")
	if !siretRegexp.MatchString(siret) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SIRET invalide"})
		return
	}

	url := fmt.Sprintf("https://recherche-entreprises.api.gouv.fr/search?q=%s&page=1&per_page=1", siret)
	httpReq, _ := http.NewRequest("GET", url, nil)
	httpReq.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := (&http.Client{}).Do(httpReq)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Impossible de contacter l'API SIRENE"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var data RechercheEntreprisesResponse
	if err := json.Unmarshal(body, &data); err != nil || data.TotalResults == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entreprise introuvable"})
		return
	}

	company := data.Results[0]
	companyName := company.NomComplet
	if companyName == "" {
		companyName = company.NomRaisonSociale
	}

	var etabAdresse, etabVille, etabCP string
	for _, etab := range company.MatchingEtablissements {
		if etab.Siret == siret {
			etabAdresse = etab.Adresse
			etabVille = etab.LibelleCommune
			etabCP = etab.CodePostal
			break
		}
	}
	if etabAdresse == "" {
		etabAdresse = company.Siege.Adresse
		etabVille = company.Siege.LibelleCommune
		etabCP = company.Siege.CodePostal
	}

	effectifsLabel := trancheEffectifs[company.TrancheEffectifSalarie]
	catLabel := categorieEntreprise[company.CategorieEntreprise]
	if catLabel == "" {
		catLabel = company.CategorieEntreprise
	}

	var lastCA *int64
	var lastCAYear string
	for year, fin := range company.Finances {
		if fin.CA != nil && (lastCAYear == "" || year > lastCAYear) {
			lastCA = fin.CA
			lastCAYear = year
		}
	}

	result := gin.H{
		"siren":          company.Siren,
		"company_name":   companyName,
		"activity_code":  company.ActivitePrincipale,
		"category":       catLabel,
		"employees":      effectifsLabel,
		"date_creation":  company.DateCreation,
		"address":        etabAdresse,
		"city":           etabVille,
		"postal_code":    etabCP,
	}
	if lastCA != nil {
		result["turnover"] = *lastCA
		result["turnover_year"] = lastCAYear
	}

	c.JSON(http.StatusOK, result)
}

func GetSiretStatus(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	if err := config.DB.Select("id, siret, siret_verified").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"siret":          user.Siret,
		"siret_verified": user.SiretVerified,
	})
}

// GetCompanyInfo retourne les infos de l'entreprise depuis l'API SIRENE pour l'utilisateur connecté.
func GetCompanyInfo(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	if err := config.DB.Select("id, siret, siret_verified").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}
	if !user.SiretVerified || user.Siret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aucun SIRET vérifié"})
		return
	}

	url := fmt.Sprintf("https://recherche-entreprises.api.gouv.fr/search?q=%s&page=1&per_page=1", user.Siret)
	httpReq, _ := http.NewRequest("GET", url, nil)
	httpReq.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := (&http.Client{}).Do(httpReq)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Impossible de contacter l'API SIRENE"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var data RechercheEntreprisesResponse
	if err := json.Unmarshal(body, &data); err != nil || data.TotalResults == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entreprise introuvable"})
		return
	}

	company := data.Results[0]
	companyName := company.NomComplet
	if companyName == "" {
		companyName = company.NomRaisonSociale
	}

	var etabAdresse, etabVille, etabCP string
	for _, etab := range company.MatchingEtablissements {
		if etab.Siret == user.Siret {
			etabAdresse = etab.Adresse
			etabVille = etab.LibelleCommune
			etabCP = etab.CodePostal
			break
		}
	}
	if etabAdresse == "" {
		etabAdresse = company.Siege.Adresse
		etabVille = company.Siege.LibelleCommune
		etabCP = company.Siege.CodePostal
	}

	effectifsLabel := trancheEffectifs[company.TrancheEffectifSalarie]
	catLabel := categorieEntreprise[company.CategorieEntreprise]
	if catLabel == "" {
		catLabel = company.CategorieEntreprise
	}

	var lastCA *int64
	var lastCAYear string
	for year, fin := range company.Finances {
		if fin.CA != nil && (lastCAYear == "" || year > lastCAYear) {
			lastCA = fin.CA
			lastCAYear = year
		}
	}

	result := gin.H{
		"siret":          user.Siret,
		"siren":          company.Siren,
		"company_name":   companyName,
		"activity_code":  company.ActivitePrincipale,
		"category":       catLabel,
		"employees":      effectifsLabel,
		"date_creation":  company.DateCreation,
		"address":        etabAdresse,
		"city":           etabVille,
		"postal_code":    etabCP,
		"siret_verified": true,
	}
	if lastCA != nil {
		result["turnover"] = *lastCA
		result["turnover_year"] = lastCAYear
	}

	c.JSON(http.StatusOK, result)
}
