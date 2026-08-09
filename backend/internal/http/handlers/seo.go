package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (h *Handlers) publicBaseURL() string {
	base := strings.TrimRight(h.Cfg.PublicBaseURL, "/")
	if base == "" {
		base = "http://localhost:5173"
	}
	return base
}

func (h *Handlers) RobotsTxt(w http.ResponseWriter, r *http.Request) {
	base := h.publicBaseURL()
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = fmt.Fprintf(w, "User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n", base)
}

func (h *Handlers) SitemapXML(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	base := h.publicBaseURL()
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)
	writeURL := func(loc string) {
		b.WriteString("<url><loc>")
		b.WriteString(xmlEscape(loc))
		b.WriteString("</loc></url>")
	}
	for _, path := range []string{"/", "/search", "/map", "/guides", "/journal"} {
		writeURL(base + path)
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT website_slug FROM guide_profiles
		WHERE status = 'ACTIVE' AND website_slug <> ''
		ORDER BY id
		LIMIT 5000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			if rows.Scan(&slug) == nil && slug != "" {
				writeURL(base + "/guide/" + slug)
			}
		}
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT e.slug FROM excursions e
		JOIN guide_profiles g ON g.id = e.guide_id
		WHERE e.status = 'PUBLISHED' AND g.status = 'ACTIVE' AND e.slug <> ''
		ORDER BY e.id
		LIMIT 5000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			if rows.Scan(&slug) == nil && slug != "" {
				writeURL(base + "/excursion/" + slug)
			}
		}
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT slug FROM articles WHERE status = 'PUBLISHED' AND slug <> ''
		ORDER BY id LIMIT 2000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			if rows.Scan(&slug) == nil && slug != "" {
				writeURL(base + "/journal/" + slug)
			}
		}
	}

	b.WriteString(`</urlset>`)
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=300")
	_, _ = w.Write([]byte(b.String()))
	_ = time.Now()
}

func xmlEscape(s string) string {
	r := strings.NewReplacer(
		`&`, "&amp;",
		`<`, "&lt;",
		`>`, "&gt;",
		`"`, "&quot;",
		`'`, "&apos;",
	)
	return r.Replace(s)
}
