package httpx

import (
	"html"
	"net/http"
	"os"
	"regexp"
	"strings"
)

const defaultOgImageKey = "d2b27d81f09874a08b4dc3293fe67f2e.webp"

var (
	localhostOriginRe = regexp.MustCompile(`https?://localhost:\d+`)
	titleRe           = regexp.MustCompile(`(?i)<title[^>]*>[^<]*</title>`)
	metaTagRe         = regexp.MustCompile(`(?m)^\s*<meta[^>]+>\s*$`)
	canonicalRe       = regexp.MustCompile(`(?i)<link[^>]+rel=["']canonical["'][^>]*>`)
	hreflangRe        = regexp.MustCompile(`(?i)<link[^>]*hreflang=[^>]*>`)
	rootDivRe         = regexp.MustCompile(`<div id="root"></div>`)
)

type PageMeta struct {
	Title             string
	Description       string
	Canonical         string
	OgImage           string
	NoIndex           bool
	LargeImagePreview bool
	JsonLd            []string
}

type spaSocialProfile struct {
	origin      string
	mediaOrigin string
	title       string
	description string
}

func portalSocialProfile() spaSocialProfile {
	return spaSocialProfile{
		origin:      apexOrigin,
		mediaOrigin: apexOrigin,
		title:       "Gaido UA",
		description: "Для українців — від українців",
	}
}

func guidesSocialProfile() spaSocialProfile {
	return spaSocialProfile{
		origin:      apexOrigin + "/svit",
		mediaOrigin: apexOrigin,
		title:       "Gaido UA",
		description: "Каталог приватних гідів і екскурсій українською за кордоном",
	}
}

func servicesSocialProfile() spaSocialProfile {
	return spaSocialProfile{
		origin:      apexOrigin + "/servis",
		mediaOrigin: apexOrigin,
		title:       "Gaido UA",
		description: "Послуги для українців за кордоном",
	}
}

func transportSocialProfile() spaSocialProfile {
	return spaSocialProfile{
		origin:      apexOrigin + "/vezu",
		mediaOrigin: apexOrigin,
		title:       "Gaido UA",
		description: "Транспорт для українців за кордоном",
	}
}

func spaSocialProfileForRequest(host, path string) (spaSocialProfile, bool) {
	switch {
	case path == "/svit" || strings.HasPrefix(path, "/svit/"):
		return guidesSocialProfile(), true
	case path == "/servis" || strings.HasPrefix(path, "/servis/"):
		return servicesSocialProfile(), true
	case path == "/vezu" || strings.HasPrefix(path, "/vezu/"):
		return transportSocialProfile(), true
	}
	switch normalizeHost(host) {
	case "gaido-ua.com", "www.gaido-ua.com":
		return portalSocialProfile(), true
	case "svit.gaido-ua.com":
		return guidesSocialProfile(), true
	case "servis.gaido-ua.com":
		return servicesSocialProfile(), true
	case "vezu.gaido-ua.com":
		return transportSocialProfile(), true
	default:
		return spaSocialProfile{}, false
	}
}

func rhMeta(attrs string) string {
	return `<meta data-rh="true" ` + attrs + ` />`
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
	mediaOrigin := profile.mediaOrigin
	if mediaOrigin == "" {
		mediaOrigin = profile.origin
	}
	canonical := profile.origin + "/"
	ogImage := mediaOrigin + "/api/v1/media/public/" + defaultOgImageKey
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

	// data-rh marks tags Helmet already owns, so the client updates them
	// instead of appending a second description / Open Graph set.
	lines := []string{
		rhMeta(`property="og:type" content="website"`),
		rhMeta(`property="og:site_name" content="` + escapeAttr(profile.title) + `"`),
		rhMeta(`property="og:title" content="` + escapeAttr(title) + `"`),
		rhMeta(`property="og:description" content="` + escapeAttr(desc) + `"`),
		rhMeta(`property="og:url" content="` + escapeAttr(canonical) + `"`),
		rhMeta(`property="og:image" content="` + escapeAttr(ogImage) + `"`),
		rhMeta(`name="description" content="` + escapeAttr(desc) + `"`),
		rhMeta(`name="twitter:card" content="summary_large_image"`),
		rhMeta(`name="twitter:title" content="` + escapeAttr(title) + `"`),
		rhMeta(`name="twitter:description" content="` + escapeAttr(desc) + `"`),
		rhMeta(`name="twitter:image" content="` + escapeAttr(ogImage) + `"`),
		`<link data-rh="true" rel="canonical" href="` + escapeAttr(canonical) + `" />`,
		`<link data-rh="true" rel="alternate" hreflang="uk" href="` + escapeAttr(canonical) + `" />`,
		`<link data-rh="true" rel="alternate" hreflang="x-default" href="` + escapeAttr(canonical) + `" />`,
	}
	if noIndex {
		lines = append(lines, rhMeta(`name="robots" content="noindex, nofollow"`))
	} else if meta != nil && meta.LargeImagePreview {
		lines = append(lines, rhMeta(`name="robots" content="max-image-preview:large"`))
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

func patchIndexHTML(html, host, path string, meta *PageMeta) string {
	profile, ok := spaSocialProfileForRequest(host, path)
	if !ok {
		return html
	}

	mediaOrigin := profile.mediaOrigin
	if mediaOrigin == "" {
		mediaOrigin = profile.origin
	}
	if strings.Contains(html, "localhost") {
		html = localhostOriginRe.ReplaceAllString(html, mediaOrigin)
	}

	title := profile.title
	if meta != nil && meta.Title != "" {
		title = meta.Title
	}
	if titleRe.MatchString(html) {
		html = titleRe.ReplaceAllString(html, `<title data-rh="true">`+escapeAttr(title)+`</title>`)
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
	html = hreflangRe.ReplaceAllString(html, "")

	headEnd := strings.Index(html, "</head>")
	if headEnd == -1 {
		return html
	}
	html = html[:headEnd] + pageMetaHeadHTML(profile, meta) + html[headEnd:]
	return rootDivRe.ReplaceAllString(html, crawlableRootHTML(meta))
}

// crawlableRootHTML gives each URL unique body text before JS runs.
// Google otherwise treats the empty SPA shell as one document and picks another URL as canonical.
func crawlableRootHTML(meta *PageMeta) string {
	if meta == nil || meta.NoIndex {
		return `<div id="root"></div>`
	}
	title := strings.TrimSpace(strings.TrimSuffix(meta.Title, " — Gaido UA"))
	desc := strings.TrimSpace(meta.Description)
	if title == "" && desc == "" {
		return `<div id="root"></div>`
	}
	var b strings.Builder
	// Hidden until React replaces #root. The text stays in the HTML for crawlers
	// and does not flash as unstyled content on first paint.
	b.WriteString(`<div id="root"><article style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">`)
	if title != "" {
		b.WriteString(`<h1>`)
		b.WriteString(html.EscapeString(title))
		b.WriteString(`</h1>`)
	}
	if desc != "" {
		b.WriteString(`<p>`)
		b.WriteString(html.EscapeString(desc))
		b.WriteString(`</p>`)
	}
	b.WriteString(`</article></div>`)
	return b.String()
}

func patchIndexSocialMeta(html, host string) string {
	return patchIndexHTML(html, host, "", nil)
}

func serveSpaIndex(w http.ResponseWriter, r *http.Request, indexPath string, meta *PageMeta) {
	raw, err := os.ReadFile(indexPath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	html := patchIndexHTML(string(raw), r.Host, r.URL.Path, meta)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	setSPAFileCacheHeaders(w, "", true)
	_, _ = w.Write([]byte(html))
}
