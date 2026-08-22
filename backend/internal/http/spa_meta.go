package httpx

import (
	"net/http"
	"os"
	"regexp"
	"strings"
)

const defaultOgImageKey = "d2b27d81f09874a08b4dc3293fe67f2e.webp"

var (
	localhostOriginRe = regexp.MustCompile(`https?://localhost:\d+`)
	titleRe           = regexp.MustCompile(`(?i)<title>[^<]*</title>`)
	metaTagRe         = regexp.MustCompile(`(?m)^\s*<meta[^>]+>\s*$`)
	canonicalRe       = regexp.MustCompile(`(?i)<link[^>]+rel=["']canonical["'][^>]*>`)
)

type PageMeta struct {
	Title       string
	Description string
	Canonical   string
	OgImage     string
	NoIndex     bool
	JsonLd      []string
}

type spaSocialProfile struct {
	origin      string
	title       string
	description string
}

func spaSocialProfileForHost(host string) (spaSocialProfile, bool) {
	switch normalizeHost(host) {
	case "gaido.top", "www.gaido.top":
		return spaSocialProfile{
			origin:      "https://gaido.top",
			title:       "Gaido",
			description: "Для українців — від українців",
		}, true
	case "svit.gaido.top":
		return spaSocialProfile{
			origin:      "https://svit.gaido.top",
			title:       "Gaido",
			description: "Гіди та екскурсії для українців за кордоном",
		}, true
	case "servis.gaido.top":
		return spaSocialProfile{
			origin:      "https://servis.gaido.top",
			title:       "Gaido Servis",
			description: "Послуги для українців за кордоном",
		}, true
	case "vezu.gaido.top":
		return spaSocialProfile{
			origin:      "https://vezu.gaido.top",
			title:       "Gaido Vezu",
			description: "Транспорт для українців за кордоном",
		}, true
	default:
		return spaSocialProfile{}, false
	}
}

func escapeAttr(s string) string {
	return strings.NewReplacer(
		`&`, "&amp;",
		`"`, "&quot;",
		`<`, "&lt;",
		`>`, "&gt;",
	).Replace(s)
}

func pageMetaHeadHTML(profile spaSocialProfile, meta *PageMeta) string {
	title := profile.title
	desc := profile.description
	canonical := profile.origin + "/"
	ogImage := profile.origin + "/api/v1/media/public/" + defaultOgImageKey
	noIndex := false

	if meta != nil {
		if meta.Title != "" {
			title = meta.Title
		}
		if meta.Description != "" {
			desc = meta.Description
		}
		if meta.Canonical != "" {
			canonical = meta.Canonical
		}
		if meta.OgImage != "" {
			ogImage = meta.OgImage
		}
		noIndex = meta.NoIndex
	}

	lines := []string{
		`<meta property="og:type" content="website" />`,
		`<meta property="og:site_name" content="` + escapeAttr(profile.title) + `" />`,
		`<meta property="og:title" content="` + escapeAttr(title) + `" />`,
		`<meta property="og:description" content="` + escapeAttr(desc) + `" />`,
		`<meta property="og:url" content="` + escapeAttr(canonical) + `" />`,
		`<meta property="og:image" content="` + escapeAttr(ogImage) + `" />`,
		`<meta name="description" content="` + escapeAttr(desc) + `" />`,
		`<meta name="twitter:card" content="summary_large_image" />`,
		`<meta name="twitter:title" content="` + escapeAttr(title) + `" />`,
		`<meta name="twitter:description" content="` + escapeAttr(desc) + `" />`,
		`<meta name="twitter:image" content="` + escapeAttr(ogImage) + `" />`,
		`<link rel="canonical" href="` + escapeAttr(canonical) + `" />`,
	}
	if noIndex {
		lines = append(lines, `<meta name="robots" content="noindex, nofollow" />`)
	}
	if meta != nil {
		for _, raw := range meta.JsonLd {
			if raw == "" {
				continue
			}
			lines = append(lines, `<script type="application/ld+json">`+raw+`</script>`)
		}
	}
	return "    " + strings.Join(lines, "\n    ") + "\n"
}

func patchIndexHTML(html, host string, meta *PageMeta) string {
	profile, ok := spaSocialProfileForHost(host)
	if !ok {
		return html
	}

	if strings.Contains(html, "localhost") {
		html = localhostOriginRe.ReplaceAllString(html, profile.origin)
	}

	title := profile.title
	if meta != nil && meta.Title != "" {
		title = meta.Title
	}
	if titleRe.MatchString(html) {
		html = titleRe.ReplaceAllString(html, "<title>"+escapeAttr(title)+"</title>")
	}

	// Remove previously injected social/canonical meta to avoid duplicates on re-patch.
	html = metaTagRe.ReplaceAllStringFunc(html, func(line string) string {
		lower := strings.ToLower(line)
		if strings.Contains(lower, `property="og:`) ||
			strings.Contains(lower, `name="twitter:`) ||
			strings.Contains(lower, `name="description"`) ||
			strings.Contains(lower, `name="robots"`) {
			return ""
		}
		return line
	})
	html = canonicalRe.ReplaceAllString(html, "")

	headEnd := strings.Index(html, "</head>")
	if headEnd == -1 {
		return html
	}
	return html[:headEnd] + pageMetaHeadHTML(profile, meta) + html[headEnd:]
}

func patchIndexSocialMeta(html, host string) string {
	return patchIndexHTML(html, host, nil)
}

func serveSpaIndex(w http.ResponseWriter, r *http.Request, indexPath string, meta *PageMeta) {
	raw, err := os.ReadFile(indexPath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	html := patchIndexHTML(string(raw), r.Host, meta)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	setSPAFileCacheHeaders(w, "", true)
	_, _ = w.Write([]byte(html))
}
