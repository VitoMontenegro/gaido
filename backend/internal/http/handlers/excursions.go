package handlers

import (
	"context"
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

func (h *Handlers) ListMyExcursions(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	h.AutoPublishPendingForGuide(r.Context(), g.ID)
	items, err := h.Exc.ListByGuideEnriched(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{
		"items":              items,
		"moderation_enabled": h.IsModerationEnabled(r.Context()),
	})
}
func (h *Handlers) CreateExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var e domain.Excursion
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	id, err := h.ExcSvc.Create(r.Context(), g.ID, &e)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	if e.CityID > 0 {
		_ = h.Guides.AddCity(r.Context(), g.ID, e.CityID, true)
	}
	_ = h.GuideSvc.ActivateForCatalogFilling(r.Context(), g.ID)
	e.ID = id
	response.JSON(w, r, 201, e)
}
func (h *Handlers) UpdateExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var e domain.Excursion
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	updated, err := h.ExcSvc.Update(r.Context(), g.ID, id, &e)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, updated)
}
func (h *Handlers) SubmitExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	status, err := h.ExcSvc.Submit(r.Context(), g.ID, id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": status})
}
func (h *Handlers) GetMyExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	e, err := h.Exc.GetByID(r.Context(), id)
	if err != nil || e == nil || e.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	e.MapEmbedURL = guidesvc.ResolveMapEmbed(e.MapEmbedURL)
	response.JSON(w, r, 200, e)
}
func (h *Handlers) DeleteExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.ExcSvc.Delete(r.Context(), g.ID, id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}
func (h *Handlers) DraftExcursion(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.ExcSvc.Draft(r.Context(), g.ID, id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": domain.ExcursionDraft})
}
func (h *Handlers) ModListExcursions(w http.ResponseWriter, r *http.Request) {
	items, err := h.Exc.ListByStatus(r.Context(), domain.ExcursionPendingModeration, 50)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) ApproveExcursion(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.ExcSvc.Approve(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "published"})
}
func (h *Handlers) RejectExcursion(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.ExcSvc.Reject(r.Context(), id); err != nil {
		response.Error(w, r, err)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "rejected"})
}
func (h *Handlers) AdminListExcursions(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	items, err := h.Exc.ListAdmin(r.Context(), status, 100)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}
func (h *Handlers) AdminDeleteExcursion(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if id <= 0 {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	guideID, err := h.Exc.AdminDelete(r.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if guideID > 0 {
		_ = h.Reviews.RecalcRating(r.Context(), guideID)
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}
func (h *Handlers) ResolveFeaturedExcursions(ctx context.Context, limit int) []domain.ExcursionView {
	out := make([]domain.ExcursionView, 0, limit)
	seen := map[int64]bool{}

	placements, _ := h.Featured.ListActiveBySlotType(ctx, domain.FeaturedSlotExcursion, limit)
	for _, p := range placements {
		if len(out) >= limit || p.ExcursionID == nil {
			continue
		}
		v, _ := h.Exc.GetViewByID(ctx, *p.ExcursionID)
		if v == nil || seen[v.ID] {
			continue
		}
		seen[v.ID] = true
		out = append(out, *v)
	}

	if len(out) < limit {
		exclude := make([]int64, 0, len(seen))
		for id := range seen {
			exclude = append(exclude, id)
		}
		randomItems, _ := h.Exc.ListPublicEnrichedRandom(ctx, limit-len(out), exclude)
		for i := range randomItems {
			if seen[randomItems[i].ID] {
				continue
			}
			seen[randomItems[i].ID] = true
			out = append(out, randomItems[i])
			if len(out) >= limit {
				break
			}
		}
	}

	return out
}
