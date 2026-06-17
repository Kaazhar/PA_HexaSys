package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

const myMemoryURL = "https://api.mymemory.translated.net/get"
const translateWorkers = 6

var i18nVarRegex = regexp.MustCompile(`\{\{[^}]+\}\}`)

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

var httpClient = &http.Client{Timeout: 10 * time.Second}

func translateOne(text, targetLang string) (string, error) {
	protected, vars := protectVars(text)

	apiURL := myMemoryURL + "?q=" + url.QueryEscape(protected) + "&langpair=fr|" + strings.ToLower(targetLang)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", err
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("service de traduction injoignable: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		log.Printf("[translateOne] HTTP %d: %s", resp.StatusCode, string(body)[:min(200, len(body))])
		return "", fmt.Errorf("service de traduction HTTP %d", resp.StatusCode)
	}

	var result struct {
		ResponseData struct {
			TranslatedText string `json:"translatedText"`
		} `json:"responseData"`
		ResponseStatus int `json:"responseStatus"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("[translateOne] parse error: %s | body: %s", err, string(body)[:min(200, len(body))])
		return "", fmt.Errorf("réponse de traduction invalide")
	}
	if result.ResponseStatus != 200 {
		return "", fmt.Errorf("traduction échouée (status %d)", result.ResponseStatus)
	}
	if result.ResponseData.TranslatedText == "" {
		return "", fmt.Errorf("traduction vide retournée")
	}
	return restoreVars(result.ResponseData.TranslatedText, vars), nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

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
					cancel()
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
