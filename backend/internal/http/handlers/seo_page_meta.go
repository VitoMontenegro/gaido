package handlers

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/vitomonte/experts-tourister/internal/http/response"
)

const pageMetaCacheTTL = 60 * time.Second
const pageMetaCacheMax = 1024
const pageMetaMaxPath = 512

type pageMetaCacheEntry struct {
	payload map[string]any
	expires time.Time
}

var pageMetaCache = struct {
	sync.Mutex
	items map[string]pageMetaCacheEntry
}{items: map[string]pageMetaCacheEntry{}}

func resetPageMetaCache() {
	pageMetaCache.Lock()
	pageMetaCache.items = map[string]pageMetaCacheEntry{}
	pageMetaCache.Unlock()
}

func pageMetaCacheGet(key string) (map[string]any, bool) {
	pageMetaCache.Lock()
	defer pageMetaCache.Unlock()
	entry, ok := pageMetaCache.items[key]
	if !ok || time.Now().After(entry.expires) {
		if ok {
			delete(pageMetaCache.items, key)
		}
		return nil, false
	}
	return entry.payload, true
}

func pageMetaCacheSet(key string, payload map[string]any) {
	pageMetaCache.Lock()
	defer pageMetaCache.Unlock()
	now := time.Now()
	if len(pageMetaCache.items) >= pageMetaCacheMax {
		for k, entry := range pageMetaCache.items {
			if now.After(entry.expires) {
				delete(pageMetaCache.items, k)
			}
		}
	}
	if _, exists := pageMetaCache.items[key]; !exists && len(pageMetaCache.items) >= pageMetaCacheMax {
		for k, entry := range pageMetaCache.items {
			found, _ := entry.payload["found"].(bool)
			if !found {
				delete(pageMetaCache.items, k)
				break
			}
		}
	}
	if _, exists := pageMetaCache.items[key]; !exists && len(pageMetaCache.items) >= pageMetaCacheMax {
		return
	}
	pageMetaCache.items[key] = pageMetaCacheEntry{payload: payload, expires: now.Add(pageMetaCacheTTL)}
}

func allowedPageMetaHost(host string) string {
	switch normalizeHost(host) {
	case "gaido-ua.com", "www.gaido-ua.com", "localhost", "127.0.0.1",
		"svit.gaido-ua.com", "servis.gaido-ua.com", "vezu.gaido-ua.com":
		return normalizeHost(host)
	default:
		return "gaido-ua.com"
	}
}

func normalizePageMetaPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	if len(path) > pageMetaMaxPath {
		path = path[:pageMetaMaxPath]
	}
	path = strings.TrimSuffix(path, "/")
	if path == "" {
		return "/"
	}
	return path
}

func unknownPageMeta(canonical string) map[string]any {
	return map[string]any{
		"title":       "Gaido UA",
		"description": "Для українців — від українців",
		"canonical":   canonical,
		"no_index":    true,
		"found":       false,
		"json_ld":     []string{},
	}
}

// GetSpaPageMetaJSON exposes ResolveSpaPageMeta for Next.js SSR.
// GET /api/v1/seo/page-meta?path=/svit/excursion/foo&host=gaido-ua.com
func (h *Handlers) GetSpaPageMetaJSON(w http.ResponseWriter, r *http.Request) {
	path := normalizePageMetaPath(r.URL.Query().Get("path"))
	host := r.URL.Query().Get("host")
	if host == "" {
		host = r.Host
	}
	host = allowedPageMetaHost(host)
	key := host + "\n" + path

	w.Header().Set("Cache-Control", "public, max-age=60")
	if payload, ok := pageMetaCacheGet(key); ok {
		response.JSON(w, r, http.StatusOK, payload)
		return
	}

	meta := h.ResolveSpaPageMeta(r.Context(), host, path)
	var payload map[string]any
	if meta == nil {
		payload = unknownPageMeta(strings.TrimRight(h.publicBaseURL(), "/") + path)
	} else {
		payload = map[string]any{
			"title":               meta.Title,
			"description":         meta.Description,
			"canonical":           meta.Canonical,
			"og_image":            meta.OgImage,
			"no_index":            meta.NoIndex,
			"large_image_preview": meta.LargeImagePreview,
			"json_ld":             meta.JsonLd,
			"crawl_body":          meta.CrawlBody,
			"found":               true,
		}
	}
	pageMetaCacheSet(key, payload)
	response.JSON(w, r, http.StatusOK, payload)
}
