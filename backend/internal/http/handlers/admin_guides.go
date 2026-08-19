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
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	guidesvc "github.com/vitomonte/experts-tourister/internal/service/guide"
)

func (h *Handlers) AdminListGuides(w http.ResponseWriter, r *http.Request) {
	items, err := h.Guides.ListAdmin(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	allDocs, err := h.Guides.ListAllDocuments(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	docsByGuide := make(map[int64][]map[string]any)
	hasLicenseByGuide := make(map[int64]bool)
	for _, d := range allDocs {
		docsByGuide[d.GuideID] = append(docsByGuide[d.GuideID], map[string]any{
			"id":        d.ID,
			"type":      d.Type,
			"mime_type": d.MimeType,
			"size":      d.Size,
		})
		if d.Type == domain.DocTypeGuideLicense || d.Type == domain.DocTypeEntertainerLicense {
			hasLicenseByGuide[d.GuideID] = true
		}
	}
	statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
	out := make([]map[string]any, 0, len(items))
	for _, g := range items {
		if statusFilter != "" && g.Status != statusFilter {
			continue
		}
		profile := guidesvc.BuildGuideAccountProfile(&g, hasLicenseByGuide[g.ID])
		docs := docsByGuide[g.ID]
		if docs == nil {
			docs = []map[string]any{}
		}
		row := map[string]any{
			"id":             g.ID,
			"display_name":   g.DisplayName,
			"slug":           g.WebsiteSlug,
			"status":         g.Status,
			"avatar_url":     g.AvatarURL,
			"guide_type":     profile.GuideType,
			"catalog_status": profile.CatalogStatus,
			"documents":      docs,
		}
		if profile.TypeBadge != nil {
			row["type_badge"] = *profile.TypeBadge
		}
		out = append(out, row)
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (h *Handlers) AdminServeGuideDocument(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	doc, err := h.Guides.GetDocumentByID(r.Context(), id)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if doc == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	path := h.Media.PrivatePath(doc.StorageKey)
	if path == "" {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	w.Header().Set("Content-Type", doc.MimeType)
	w.Header().Set("Content-Disposition", "inline")
	http.ServeFile(w, r, path)
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
	if err := h.Exc.DeleteAllByGuide(r.Context(), id); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
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
