package httpx

import (
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/http/cacheheaders"
)

func setSPAFileCacheHeaders(w http.ResponseWriter, rel string, isIndex bool) {
	if isIndex {
		w.Header().Set("Cache-Control", cacheheaders.HTML)
		return
	}
	switch {
	case strings.HasPrefix(rel, "assets/"):
		w.Header().Set("Cache-Control", cacheheaders.Immutable)
	case strings.HasPrefix(rel, "fonts/"), strings.HasPrefix(rel, "images/"):
		w.Header().Set("Cache-Control", cacheheaders.Immutable)
	case isRootStaticAsset(rel):
		w.Header().Set("Cache-Control", cacheheaders.Day)
	default:
		w.Header().Set("Cache-Control", cacheheaders.Week)
	}
}

func isRootStaticAsset(rel string) bool {
	switch {
	case strings.HasPrefix(rel, "favicon"):
		return true
	case strings.HasPrefix(rel, "apple-touch-icon"):
		return true
	case rel == "robots.txt", rel == "manifest.webmanifest", rel == "build-id.txt":
		return true
	default:
		return false
	}
}
