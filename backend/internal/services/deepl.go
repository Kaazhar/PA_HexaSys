package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"upcycleconnect/backend/config"
)

// Nombre de workers parallèles pour LibreTranslate
const translateWorkers = 8

// Instance publique par défaut — pas de clé requise
const defaultLibreURL = "https://translate.argosopentech.com/translate"

var i18nVarRegex = regexp.MustCompile(`\{\{[^}]+\}\}`)

func getLibreURL() string {
	return config.GetEnv("LIBRETRANSLATE_URL", defaultLibreURL)
}

// Remplace {{var}} par des placeholders neutres (LibreTranslate peut les casser sinon)
func protectVars(s string) (string, []string) {
	vars := []string{}
	result := i18nVarRegex.ReplaceAllStringFunc(s, func(match string) string {
		idx := len(vars)
		vars = append(vars, match)
		return fmt.Sprintf("UPCVAR%dEND", idx)
	})
	return result, vars
}

func restoreVars(s string, vars []string) string {
	for i, v := range vars {
		s = strings.ReplaceAll(s, fmt.Sprintf("UPCVAR%dEND", i), v)
	}
	return s
}

type libreRequest struct {
	Q      string `json:"q"`
	Source string `json:"source"`
	Target string `json:"target"`
	Format string `json:"format"`
	APIKey string `json:"api_key,omitempty"`
}

type libreResponse struct {
	TranslatedText string `json:"translatedText"`
}

func translateOne(text, targetLang string) (string, error) {
	protected, vars := protectVars(text)

	apiKey := config.GetEnv("LIBRETRANSLATE_API_KEY", "")

	reqBody, _ := json.Marshal(libreRequest{
		Q:      protected,
		Source: "fr",
		Target: strings.ToLower(targetLang),
		Format: "text",
		APIKey: apiKey,
	})

	resp, err := http.Post(getLibreURL(), "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("LibreTranslate erreur %d: %s", resp.StatusCode, string(body))
	}

	var result libreResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	return restoreVars(result.TranslatedText, vars), nil
}

// Collecte toutes les strings d'un objet JSON (ordre déterministe par clés triées)
func collectAllStrings(obj interface{}, result *[]string) {
	switch v := obj.(type) {
	case map[string]interface{}:
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			collectAllStrings(v[k], result)
		}
	case []interface{}:
		for _, item := range v {
			collectAllStrings(item, result)
		}
	case string:
		*result = append(*result, v)
	}
}

// Remet les strings traduites dans l'objet (même ordre de traversal)
func setAllStrings(obj interface{}, translated []string, idx *int) interface{} {
	switch v := obj.(type) {
	case map[string]interface{}:
		result := make(map[string]interface{})
		keys := make([]string, 0, len(v))
		for k := range v {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			result[k] = setAllStrings(v[k], translated, idx)
		}
		return result
	case []interface{}:
		result := make([]interface{}, len(v))
		for i, item := range v {
			result[i] = setAllStrings(item, translated, idx)
		}
		return result
	case string:
		s := translated[*idx]
		*idx++
		return s
	default:
		return obj
	}
}

// TranslateJSON traduit toutes les valeurs string d'un JSON depuis le français vers targetLang (code ISO)
func TranslateJSON(sourceJSON, targetLang string) (string, error) {
	var sourceObj interface{}
	if err := json.Unmarshal([]byte(sourceJSON), &sourceObj); err != nil {
		return "", fmt.Errorf("JSON invalide: %w", err)
	}

	var texts []string
	collectAllStrings(sourceObj, &texts)

	if len(texts) == 0 {
		return sourceJSON, nil
	}

	// Pool de workers parallèles
	type job struct {
		idx  int
		text string
	}

	translated := make([]string, len(texts))
	errs := make([]error, len(texts))
	jobs := make(chan job, len(texts))

	var wg sync.WaitGroup
	for i := 0; i < translateWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				res, err := translateOne(j.text, targetLang)
				translated[j.idx] = res
				errs[j.idx] = err
			}
		}()
	}

	for i, text := range texts {
		jobs <- job{idx: i, text: text}
	}
	close(jobs)
	wg.Wait()

	for i, err := range errs {
		if err != nil {
			return "", fmt.Errorf("erreur traduction item %d: %w", i, err)
		}
	}

	idx := 0
	resultObj := setAllStrings(sourceObj, translated, &idx)

	out, err := json.MarshalIndent(resultObj, "", "  ")
	if err != nil {
		return "", err
	}
	return string(out), nil
}
