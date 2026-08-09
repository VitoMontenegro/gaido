package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) AdminListGuides(w http.ResponseWriter, r *http.Request) {
	items, err := h.Guides.ListAdmin(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	out := make([]map[string]any, 0, len(items))
	for _, g := range items {
		if statusFilter != "" && g.Status != statusFilter {
			continue
		}
		out = append(out, map[string]any{
			"id":           g.ID,
			"display_name": g.DisplayName,
			"slug":         g.WebsiteSlug,
			"status":       g.Status,
			"avatar_url":   g.AvatarURL,
		})
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}
func (h *Handlers) AdminUpdateGuide(w http.ResponseWriter, r *http.Request) {
	gid, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	g, err := h.Guides.GetByID(r.Context(), gid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	g.AvatarURL = strings.TrimSpace(req.AvatarURL)
	if err := h.Guides.UpdateProfile(r.Context(), g); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "GUIDE_AVATAR_UPDATE", "guide", &gid, "", g.AvatarURL, r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]any{
		"id":           g.ID,
		"display_name": g.DisplayName,
		"slug":         g.WebsiteSlug,
		"status":       g.Status,
		"avatar_url":   g.AvatarURL,
	})
}
func (h *Handlers) AdminDeleteGuide(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	g, err := h.Guides.GetByID(r.Context(), id)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Guides.AdminDelete(r.Context(), id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	actor := middleware.UserIDFromContext(r.Context())
	_ = h.Audit.Log(r.Context(), &actor, "GUIDE_DELETE", "guide", &id, g.DisplayName, "", r.RemoteAddr, r.UserAgent())
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}
