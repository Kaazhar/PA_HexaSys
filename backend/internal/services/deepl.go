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
	"upcycleconnect/backend/config"
)

var i18nVarRegex = regexp.MustCompile(`\{\{[^}]+\}\}`)

func getDeepLEndpoint() string {
	key := config.GetEnv("DEEPL_API_KEY", "")
	if strings.HasSuffix(key, ":fx") {
		return "https://api-free.deepl.com/v2/translate"
	}
	return "https://api.deepl.com/v2/translate"
}

// Remplace {{var}} par des placeholders neutres pour DeepL
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

type deeplRequest struct {
	Text               []string `json:"text"`
	SourceLang         string   `json:"source_lang"`
	TargetLang         string   `json:"target_lang"`
	PreserveFormatting bool     `json:"preserve_formatting"`
}

type deeplResponse struct {
	Translations []struct {
		Text string `json:"text"`
	} `json:"translations"`
}

func translateBatch(texts []string, targetLang string) ([]string, error) {
	apiKey := config.GetEnv("DEEPL_API_KEY", "")
	if apiKey == "" {
		return nil, fmt.Errorf("DEEPL_API_KEY non configurée")
	}

	protected := make([]string, len(texts))
	varMaps := make([][]string, len(texts))
	for i, t := range texts {
		protected[i], varMaps[i] = protectVars(t)
	}

	reqBody, err := json.Marshal(deeplRequest{
		Text:               protected,
		SourceLang:         "FR",
		TargetLang:         strings.ToUpper(targetLang),
		PreserveFormatting: true,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", getDeepLEndpoint(), bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "DeepL-Auth-Key "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("DeepL API erreur %d: %s", resp.StatusCode, string(body))
	}

	var result deeplResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if len(result.Translations) != len(texts) {
		return nil, fmt.Errorf("DeepL: réponse inattendue (%d résultats pour %d textes)", len(result.Translations), len(texts))
	}

	translated := make([]string, len(texts))
	for i, t := range result.Translations {
		translated[i] = restoreVars(t.Text, varMaps[i])
	}
	return translated, nil
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

// TranslateJSON traduit toutes les valeurs string d'un JSON du français vers targetLang (code DeepL)
func TranslateJSON(sourceJSON string, targetLang string) (string, error) {
	var sourceObj interface{}
	if err := json.Unmarshal([]byte(sourceJSON), &sourceObj); err != nil {
		return "", fmt.Errorf("JSON invalide: %w", err)
	}

	var texts []string
	collectAllStrings(sourceObj, &texts)

	if len(texts) == 0 {
		return sourceJSON, nil
	}

	// Traduction par lots de 50 (limite DeepL)
	translated := make([]string, len(texts))
	batchSize := 50
	for i := 0; i < len(texts); i += batchSize {
		end := i + batchSize
		if end > len(texts) {
			end = len(texts)
		}
		batch, err := translateBatch(texts[i:end], targetLang)
		if err != nil {
			return "", err
		}
		copy(translated[i:end], batch)
	}

	idx := 0
	resultObj := setAllStrings(sourceObj, translated, &idx)

	out, err := json.MarshalIndent(resultObj, "", "  ")
	if err != nil {
		return "", err
	}
	return string(out), nil
}
