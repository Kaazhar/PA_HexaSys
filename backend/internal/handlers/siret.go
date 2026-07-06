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

type RequeteSiret struct {
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

func VerifierSiret(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var req RequeteSiret
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !siretRegexp.MatchString(req.Siret) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Le SIRET doit contenir exactement 14 chiffres"})
		return
	}

	url := fmt.Sprintf("https://recherche-entreprises.api.gouv.fr/search?q=%s&page=1&per_page=1", req.Siret)
	requete, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur interne"})
		return
	}
	requete.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := (&http.Client{}).Do(requete)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Impossible de contacter l'API SIRENE"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Service SIRENE indisponible, réessayez plus tard"})
		return
	}

	corps, _ := io.ReadAll(resp.Body)
	var donnees RechercheEntreprisesResponse
	if err := json.Unmarshal(corps, &donnees); err != nil || donnees.TotalResults == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SIRET introuvable dans la base SIRENE"})
		return
	}

	entreprise := donnees.Results[0]

	if entreprise.EtatAdministratif != "A" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette entreprise n'est pas active (fermée ou radiée)"})
		return
	}

	var etabAdresse, etabVille, etabCP string
	etabActif := false
	for _, etab := range entreprise.MatchingEtablissements {
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
	if !etabActif && entreprise.Siege.Siret == req.Siret {
		etabActif = entreprise.Siege.EtatAdministratif == "A"
		etabAdresse = entreprise.Siege.Adresse
		etabVille = entreprise.Siege.LibelleCommune
		etabCP = entreprise.Siege.CodePostal
	}
	if !etabActif {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cet établissement n'est pas actif"})
		return
	}

	nomEntreprise := entreprise.NomComplet
	if nomEntreprise == "" {
		nomEntreprise = entreprise.NomRaisonSociale
	}

	libelleEffectifs := trancheEffectifs[entreprise.TrancheEffectifSalarie]
	if libelleEffectifs == "" && entreprise.TrancheEffectifSalarie != "" {
		libelleEffectifs = "Tranche " + entreprise.TrancheEffectifSalarie
	}

	libelleCategorie := categorieEntreprise[entreprise.CategorieEntreprise]
	if libelleCategorie == "" {
		libelleCategorie = entreprise.CategorieEntreprise
	}

	var dernierCA *int64
	var anneeDernierCA string
	for annee, fin := range entreprise.Finances {
		if fin.CA != nil && (anneeDernierCA == "" || annee > anneeDernierCA) {
			dernierCA = fin.CA
			anneeDernierCA = annee
		}
	}

	var utilisateur models.User
	config.DB.First(&utilisateur, idUtilisateur)
	config.DB.Model(&utilisateur).Updates(map[string]interface{}{
		"siret":          req.Siret,
		"siret_verified": true,
	})

	config.DB.Create(&models.Notification{
		UserID:  utilisateur.ID,
		Message: fmt.Sprintf("Votre SIRET %s a été vérifié avec succès. Entreprise : %s", req.Siret, nomEntreprise),
		Type:    "success",
	})

	reponse := gin.H{
		"message":        "SIRET vérifié avec succès",
		"siret":          req.Siret,
		"siren":          entreprise.Siren,
		"company_name":   nomEntreprise,
		"activity_code":  entreprise.ActivitePrincipale,
		"category":       libelleCategorie,
		"employees":      libelleEffectifs,
		"date_creation":  entreprise.DateCreation,
		"address":        etabAdresse,
		"city":           etabVille,
		"postal_code":    etabCP,
		"siret_verified": true,
	}
	if dernierCA != nil {
		reponse["turnover"] = *dernierCA
		reponse["turnover_year"] = anneeDernierCA
	}

	c.JSON(http.StatusOK, reponse)
}

func ObtenirEntrepriseSiret(c *gin.Context) {
	siret := c.Param("siret")
	if !siretRegexp.MatchString(siret) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "SIRET invalide"})
		return
	}

	url := fmt.Sprintf("https://recherche-entreprises.api.gouv.fr/search?q=%s&page=1&per_page=1", siret)
	requete, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur interne"})
		return
	}
	requete.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := (&http.Client{}).Do(requete)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Impossible de contacter l'API SIRENE"})
		return
	}
	defer resp.Body.Close()

	corps, _ := io.ReadAll(resp.Body)
	var donnees RechercheEntreprisesResponse
	if err := json.Unmarshal(corps, &donnees); err != nil || donnees.TotalResults == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entreprise introuvable"})
		return
	}

	entreprise := donnees.Results[0]
	nomEntreprise := entreprise.NomComplet
	if nomEntreprise == "" {
		nomEntreprise = entreprise.NomRaisonSociale
	}

	var etabAdresse, etabVille, etabCP string
	for _, etab := range entreprise.MatchingEtablissements {
		if etab.Siret == siret {
			etabAdresse = etab.Adresse
			etabVille = etab.LibelleCommune
			etabCP = etab.CodePostal
			break
		}
	}
	if etabAdresse == "" {
		etabAdresse = entreprise.Siege.Adresse
		etabVille = entreprise.Siege.LibelleCommune
		etabCP = entreprise.Siege.CodePostal
	}

	libelleEffectifs := trancheEffectifs[entreprise.TrancheEffectifSalarie]
	libelleCategorie := categorieEntreprise[entreprise.CategorieEntreprise]
	if libelleCategorie == "" {
		libelleCategorie = entreprise.CategorieEntreprise
	}

	var dernierCA *int64
	var anneeDernierCA string
	for annee, fin := range entreprise.Finances {
		if fin.CA != nil && (anneeDernierCA == "" || annee > anneeDernierCA) {
			dernierCA = fin.CA
			anneeDernierCA = annee
		}
	}

	reponse := gin.H{
		"siren":         entreprise.Siren,
		"company_name":  nomEntreprise,
		"activity_code": entreprise.ActivitePrincipale,
		"category":      libelleCategorie,
		"employees":     libelleEffectifs,
		"date_creation": entreprise.DateCreation,
		"address":       etabAdresse,
		"city":          etabVille,
		"postal_code":   etabCP,
	}
	if dernierCA != nil {
		reponse["turnover"] = *dernierCA
		reponse["turnover_year"] = anneeDernierCA
	}

	c.JSON(http.StatusOK, reponse)
}

func StatutSiret(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var utilisateur models.User
	if err := config.DB.Select("id, siret, siret_verified").First(&utilisateur, idUtilisateur).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"siret":          utilisateur.Siret,
		"siret_verified": utilisateur.SiretVerified,
	})
}

func InfosEntreprise(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var utilisateur models.User
	if err := config.DB.Select("id, siret, siret_verified").First(&utilisateur, idUtilisateur).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Utilisateur introuvable"})
		return
	}
	if !utilisateur.SiretVerified || utilisateur.Siret == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aucun SIRET vérifié"})
		return
	}

	url := fmt.Sprintf("https://recherche-entreprises.api.gouv.fr/search?q=%s&page=1&per_page=1", utilisateur.Siret)
	requete, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur interne"})
		return
	}
	requete.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := (&http.Client{}).Do(requete)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Impossible de contacter l'API SIRENE"})
		return
	}
	defer resp.Body.Close()

	corps, _ := io.ReadAll(resp.Body)
	var donnees RechercheEntreprisesResponse
	if err := json.Unmarshal(corps, &donnees); err != nil || donnees.TotalResults == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entreprise introuvable"})
		return
	}

	entreprise := donnees.Results[0]
	nomEntreprise := entreprise.NomComplet
	if nomEntreprise == "" {
		nomEntreprise = entreprise.NomRaisonSociale
	}

	var etabAdresse, etabVille, etabCP string
	for _, etab := range entreprise.MatchingEtablissements {
		if etab.Siret == utilisateur.Siret {
			etabAdresse = etab.Adresse
			etabVille = etab.LibelleCommune
			etabCP = etab.CodePostal
			break
		}
	}
	if etabAdresse == "" {
		etabAdresse = entreprise.Siege.Adresse
		etabVille = entreprise.Siege.LibelleCommune
		etabCP = entreprise.Siege.CodePostal
	}

	libelleEffectifs := trancheEffectifs[entreprise.TrancheEffectifSalarie]
	libelleCategorie := categorieEntreprise[entreprise.CategorieEntreprise]
	if libelleCategorie == "" {
		libelleCategorie = entreprise.CategorieEntreprise
	}

	var dernierCA *int64
	var anneeDernierCA string
	for annee, fin := range entreprise.Finances {
		if fin.CA != nil && (anneeDernierCA == "" || annee > anneeDernierCA) {
			dernierCA = fin.CA
			anneeDernierCA = annee
		}
	}

	reponse := gin.H{
		"siret":          utilisateur.Siret,
		"siren":          entreprise.Siren,
		"company_name":   nomEntreprise,
		"activity_code":  entreprise.ActivitePrincipale,
		"category":       libelleCategorie,
		"employees":      libelleEffectifs,
		"date_creation":  entreprise.DateCreation,
		"address":        etabAdresse,
		"city":           etabVille,
		"postal_code":    etabCP,
		"siret_verified": true,
	}
	if dernierCA != nil {
		reponse["turnover"] = *dernierCA
		reponse["turnover_year"] = anneeDernierCA
	}

	c.JSON(http.StatusOK, reponse)
}
