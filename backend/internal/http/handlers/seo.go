package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (h *Handlers) RobotsTxt(w http.ResponseWriter, r *http.Request) {
	base := h.publicBaseURL()
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	lines := []string{
		"User-agent: *",
		"Allow: /",
		"Disallow: /account",
		"Disallow: /account/",
		"Disallow: /login",
		"Disallow: /register",
		"Disallow: /admin",
		"Disallow: /moderator",
		"Disallow: /downloads",
		"Disallow: /favorites",
		"Disallow: /search?",
		"Disallow: /ukrainians-in/",
		fmt.Sprintf("Sitemap: %s/sitemap.xml", base),
	}
	_, _ = fmt.Fprint(w, strings.Join(lines, "\n")+"\n")
}

func (h *Handlers) SitemapXML(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	base := h.publicBaseURL()
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)

	writeURL := func(loc string, lastmod string) {
		b.WriteString("<url><loc>")
		b.WriteString(xmlEscape(loc))
		b.WriteString("</loc>")
		if lastmod != "" {
			b.WriteString("<lastmod>")
			b.WriteString(xmlEscape(lastmod))
			b.WriteString("</lastmod>")
		}
		b.WriteString("</url>")
	}

	today := time.Now().UTC().Format("2006-01-02")
	for _, path := range []string{"/", "/search", "/map", "/guides", "/journal", "/about"} {
		writeURL(base+path, today)
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT co.slug, COALESCE(MAX(e.updated_at), NOW())::date
		FROM countries co
		JOIN cities c ON c.country_id = co.id AND c.is_active = true
		JOIN excursions e ON e.city_id = c.id AND e.status = 'PUBLISHED'
		JOIN guide_profiles g ON g.id = e.guide_id AND g.status = 'ACTIVE'
		WHERE co.is_active = true AND co.slug <> ''
		GROUP BY co.id, co.slug
		ORDER BY co.slug
		LIMIT 500
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var lastmod time.Time
			if rows.Scan(&slug, &lastmod) == nil && slug != "" {
				writeURL(base+"/countries/"+slug, lastmod.Format("2006-01-02"))
				writeURL(base+"/guides/countries/"+slug, lastmod.Format("2006-01-02"))
			}
		}
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT c.slug, COALESCE(MAX(e.updated_at), NOW())::date
		FROM cities c
		JOIN excursions e ON e.city_id = c.id AND e.status = 'PUBLISHED'
		JOIN guide_profiles g ON g.id = e.guide_id AND g.status = 'ACTIVE'
		WHERE c.is_active = true AND c.slug <> ''
		GROUP BY c.id, c.slug
		ORDER BY c.slug
		LIMIT 5000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var lastmod time.Time
			if rows.Scan(&slug, &lastmod) == nil && slug != "" {
				writeURL(base+"/city/"+slug, lastmod.Format("2006-01-02"))
			}
		}
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT website_slug, COALESCE(updated_at, created_at)::date
		FROM guide_profiles
		WHERE status = 'ACTIVE' AND website_slug <> ''
		ORDER BY id
		LIMIT 5000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var lastmod time.Time
			if rows.Scan(&slug, &lastmod) == nil && slug != "" {
				writeURL(base+"/guide/"+slug, lastmod.Format("2006-01-02"))
			}
		}
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT e.slug, COALESCE(e.updated_at, NOW())::date
		FROM excursions e
		JOIN guide_profiles g ON g.id = e.guide_id
		WHERE e.status = 'PUBLISHED' AND g.status = 'ACTIVE' AND e.slug <> ''
		ORDER BY e.id
		LIMIT 5000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var lastmod time.Time
			if rows.Scan(&slug, &lastmod) == nil && slug != "" {
				writeURL(base+"/excursion/"+slug, lastmod.Format("2006-01-02"))
			}
		}
	}

	if rows, err := h.DB.Pool.Query(ctx, `
		SELECT slug, COALESCE(published_at, updated_at, created_at)::date
		FROM articles WHERE status = 'PUBLISHED' AND slug <> ''
		ORDER BY id LIMIT 2000
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var lastmod time.Time
			if rows.Scan(&slug, &lastmod) == nil && slug != "" {
				writeURL(base+"/journal/"+slug, lastmod.Format("2006-01-02"))
			}
		}
	}

	for _, slug := range []string{"privacy", "site-rules", "placement-rules"} {
		writeURL(base+"/legal/"+slug, today)
	}

	b.WriteString(`</urlset>`)
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=300")
	_, _ = w.Write([]byte(b.String()))
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
