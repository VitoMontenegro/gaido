package guide

import (
	"net/url"
	"regexp"
	"strings"
)

var iframeSrcRe = regexp.MustCompile(`(?i)<iframe[^>]+src=["']([^"']+)["']`)

// Exact host allowlist for map embeds (https only).
var mapHosts = map[string]struct{}{
	"www.google.com":        {},
	"maps.google.com":       {},
	"maps.googleapis.com":   {},
	"www.google.com.ua":     {},
	"www.openstreetmap.org": {},
	"openstreetmap.org":     {},
	"www.osm.org":           {},
	"osm.org":               {},
	"yandex.ru":             {},
	"yandex.ua":             {},
	"yandex.com":            {},
	"www.yandex.ru":         {},
	"www.yandex.ua":         {},
	"www.yandex.com":        {},
	"mapy.cz":               {},
	"www.mapy.cz":           {},
	"maps.apple.com":        {},
}

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
	if err != nil || u.Scheme != "https" {
		return ""
	}
	host := strings.ToLower(u.Hostname())
	if _, ok := mapHosts[host]; !ok {
		return ""
	}
	return u.String()
}
