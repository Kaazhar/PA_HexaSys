package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
)

// Google Translate non-officiel (client=gtx) : sans clé, sans compte, sans limite quotidienne stricte
const googleTranslateURL = "https://translate.googleapis.com/translate_a/single"
const translateWorkers = 6

var i18nVarRegex = regexp.MustCompile(`\{\{[^}]+\}\}`)

// Remplace {{var}} par des placeholders neutres
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

func translateOne(text, targetLang string) (string, error) {
	protected, vars := protectVars(text)

	params := url.Values{}
	params.Set("client", "gtx")
	params.Set("sl", "fr")
	params.Set("tl", strings.ToLower(targetLang))
	params.Set("dt", "t")
	params.Set("q", protected)

	resp, err := http.Get(googleTranslateURL + "?" + params.Encode())
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// Réponse : [[[\"translated\",\"original\",...], ...], null, \"fr\"]
	// On parse le tableau externe en RawMessage pour éviter les erreurs sur null/"fr"
	var outerRaw []json.RawMessage
	if err := json.Unmarshal(body, &outerRaw); err != nil || len(outerRaw) == 0 {
		return text, nil
	}

	var chunks [][]interface{}
	if err := json.Unmarshal(outerRaw[0], &chunks); err != nil || len(chunks) == 0 {
		return text, nil
	}

	var translated strings.Builder
	for _, chunk := range chunks {
		if len(chunk) > 0 {
			if s, ok := chunk[0].(string); ok {
				translated.WriteString(s)
			}
		}
	}

	result := translated.String()
	if result == "" {
		return text, nil
	}
	return restoreVars(result, vars), nil
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

	// Pool de workers parallèles avec annulation dès le premier rate-limit
	type job struct {
		idx  int
		text string
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	translated := make([]string, len(texts))
	errs := make([]error, len(texts))
	jobs := make(chan job, len(texts))

	var wg sync.WaitGroup
	for i := 0; i < translateWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}
				res, err := translateOne(j.text, targetLang)
				translated[j.idx] = res
				errs[j.idx] = err
				if err != nil {
					cancel() // stoppe les autres workers
				}
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
