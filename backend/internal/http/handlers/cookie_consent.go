package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) AcceptCookieConsent(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ConsentToken string          `json:"consent_token"`
		PageURL      string          `json:"page_url"`
		BrowserInfo  json.RawMessage `json:"browser_info"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ConsentToken == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if len(req.ConsentToken) > 64 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}

	ip := middleware.ClientIP(r, h.Cfg.TrustProxy)
	ua := r.UserAgent()

	id, err := h.CookieConsents.Create(r.Context(), domain.CookieConsent{
		ConsentToken:   req.ConsentToken,
		IP:             ip,
		UserAgent:      ua,
		AcceptLanguage: r.Header.Get("Accept-Language"),
		Referer:        r.Header.Get("Referer"),
		PageURL:        req.PageURL,
		BrowserInfo:    req.BrowserInfo,
	})
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]any{"id": id, "status": "accepted"})
}

func (h *Handlers) AdminCookieConsents(w http.ResponseWriter, r *http.Request) {
	items, err := h.CookieConsents.ListRecent(r.Context(), 200)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	out := make([]map[string]any, 0, len(items))
	for _, c := range items {
		row := map[string]any{
			"id":              c.ID,
			"consent_token":   c.ConsentToken,
			"user_id":         c.UserID,
			"ip":              c.IP,
			"user_agent":      c.UserAgent,
			"accept_language": c.AcceptLanguage,
			"referer":         c.Referer,
			"page_url":        c.PageURL,
			"created_at":      c.CreatedAt,
		}
		if len(c.BrowserInfo) > 0 {
			row["browser_info"] = json.RawMessage(c.BrowserInfo)
		}
		out = append(out, row)
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}
