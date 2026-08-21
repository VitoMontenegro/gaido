package httpx

import (
	"net/http"
	"os"
	"regexp"
	"strings"
)

const defaultOgImageKey = "d2b27d81f09874a08b4dc3293fe67f2e.webp"

var localhostOriginRe = regexp.MustCompile(`https?://localhost:\d+`)

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

func socialMetaHTML(profile spaSocialProfile, ogImage string) string {
	return strings.Join([]string{
		`    <meta property="og:type" content="website" />`,
		`<meta property="og:site_name" content="` + profile.title + `" />`,
		`<meta property="og:title" content="` + profile.title + `" />`,
		`<meta property="og:description" content="` + profile.description + `" />`,
		`<meta property="og:url" content="` + profile.origin + `/" />`,
		`<meta property="og:image" content="` + ogImage + `" />`,
		`<meta name="description" content="` + profile.description + `" />`,
		`<meta name="twitter:card" content="summary_large_image" />`,
		`<meta name="twitter:title" content="` + profile.title + `" />`,
		`<meta name="twitter:description" content="` + profile.description + `" />`,
		`<meta name="twitter:image" content="` + ogImage + `" />`,
	}, "\n") + "\n"
}

func patchIndexSocialMeta(html, host string) string {
	profile, ok := spaSocialProfileForHost(host)
	if !ok {
		return html
	}

	ogImage := profile.origin + "/api/v1/media/public/" + defaultOgImageKey
	if strings.Contains(html, ogImage) {
		return html
	}

	if strings.Contains(html, "localhost") {
		html = localhostOriginRe.ReplaceAllString(html, profile.origin)
		if strings.Contains(html, ogImage) {
			return html
		}
	}

	meta := socialMetaHTML(profile, ogImage)
	headEnd := strings.Index(html, "</head>")
	if headEnd == -1 {
		return html
	}
	return html[:headEnd] + meta + html[headEnd:]
}

func serveSpaIndex(w http.ResponseWriter, r *http.Request, indexPath string) {
	raw, err := os.ReadFile(indexPath)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	html := patchIndexSocialMeta(string(raw), r.Host)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	setSpaCacheHeaders(w, "", true)
	_, _ = w.Write([]byte(html))
}
