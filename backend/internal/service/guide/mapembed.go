package guide

import (
	"net/url"
	"regexp"
	"strings"
)

var iframeSrcRe = regexp.MustCompile(`(?i)<iframe[^>]+src=["']([^"']+)["']`)

// ResolveMapEmbed accepts a maps embed URL or full <iframe src="..."> HTML.
// Plain text (e.g. pasted program paragraphs) is rejected.
func ResolveMapEmbed(raw string) string {
	v := strings.TrimSpace(raw)
	if v == "" {
		return ""
	}

	fromIframe := ""
	if m := iframeSrcRe.FindStringSubmatch(v); len(m) > 1 {
		fromIframe = strings.TrimSpace(m[1])
	}
	candidate := v
	if fromIframe != "" {
		candidate = fromIframe
	} else if strings.ContainsAny(candidate, " \t\n\r") || len(candidate) > 500 {
		return ""
	}

	u, err := url.Parse(candidate)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return ""
	}
	host := strings.ToLower(u.Hostname())
	href := strings.ToLower(u.String())
	looksLikeMap := strings.Contains(host, "google.") ||
		strings.Contains(host, "googleapis.com") ||
		strings.Contains(host, "openstreetmap.org") ||
		strings.Contains(host, "osm.org") ||
		strings.Contains(host, "yandex.") ||
		strings.Contains(host, "mapy.cz") ||
		strings.Contains(host, "maps.apple.com") ||
		strings.Contains(href, "/maps") ||
		strings.Contains(href, "map=") ||
		strings.Contains(href, "embed")
	if !looksLikeMap {
		return ""
	}
	return u.String()
}
