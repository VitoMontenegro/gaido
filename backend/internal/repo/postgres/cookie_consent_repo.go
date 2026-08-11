package postgres

import (
	"context"
	"encoding/json"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type CookieConsentRepo struct{ db *DB }

func NewCookieConsentRepo(db *DB) *CookieConsentRepo { return &CookieConsentRepo{db: db} }

func (r *CookieConsentRepo) Create(ctx context.Context, c domain.CookieConsent) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO cookie_consents (
			consent_token, user_id, ip, user_agent, accept_language, referer, page_url, browser_info
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (consent_token) DO UPDATE SET consent_token = cookie_consents.consent_token
		RETURNING id
	`, c.ConsentToken, c.UserID, c.IP, c.UserAgent, nullIfEmpty(c.AcceptLanguage), nullIfEmpty(c.Referer), nullIfEmpty(c.PageURL), jsonOrNull(c.BrowserInfo)).Scan(&id)
	return id, err
}

func (r *CookieConsentRepo) ListRecent(ctx context.Context, limit int) ([]domain.CookieConsent, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, consent_token, user_id, ip, user_agent, accept_language, referer, page_url, browser_info, created_at
		FROM cookie_consents ORDER BY id DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []domain.CookieConsent
	for rows.Next() {
		var c domain.CookieConsent
		var browserInfo []byte
		if err := rows.Scan(
			&c.ID, &c.ConsentToken, &c.UserID, &c.IP, &c.UserAgent,
			&c.AcceptLanguage, &c.Referer, &c.PageURL, &browserInfo, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		if len(browserInfo) > 0 {
			c.BrowserInfo = json.RawMessage(browserInfo)
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func jsonOrNull(raw json.RawMessage) []byte {
	if len(raw) == 0 {
		return nil
	}
	return raw
}
