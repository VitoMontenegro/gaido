package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/service/aiwriter"
)

var (
	errAIUnavailable   = apperrors.New("AI_UNAVAILABLE", "Покращення тексту за допомогою ШІ тимчасово недоступне.", 503)
	errAITextTooShort  = apperrors.New("AI_TEXT_TOO_SHORT", "Напишіть хоча б кілька речень — ШІ потрібні ваші факти, щоб покращити текст.", 400)
	errAITextTooLong   = apperrors.New("AI_TEXT_TOO_LONG", "Текст задовгий для покращення. Скоротіть його та спробуйте ще раз.", 400)
	errAIResultTooLong = apperrors.New("AI_RESULT_TOO_LONG", "ШІ запропонував задовгий текст. Спробуйте ще раз.", 502)
	errAIFailed        = apperrors.New("AI_FAILED", "Не вдалося згенерувати текст. Спробуйте ще раз за хвилину.", 502)
)

type aiImproveTextRequest struct {
	Kind   string `json:"kind"`
	Text   string `json:"text"`
	Name   string `json:"name,omitempty"`
	City   string `json:"city,omitempty"`
	CityID int64  `json:"city_id,omitempty"`
	Title  string `json:"title,omitempty"`
}

// AIImproveText rewrites a guide's draft (profile "about" or excursion description)
// into polished Ukrainian copy. Nothing is saved: the guide reviews the result in the form.
func (h *Handlers) AIImproveText(w http.ResponseWriter, r *http.Request) {
	if h.AIWriter == nil || !h.AIWriter.Enabled() {
		response.Error(w, r, errAIUnavailable)
		return
	}
	var req aiImproveTextRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10)).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	in := aiwriter.Input{
		Kind:  aiwriter.Kind(strings.TrimSpace(req.Kind)),
		Text:  req.Text,
		Name:  req.Name,
		City:  req.City,
		Title: req.Title,
	}
	if in.City == "" && req.CityID > 0 && h.Geo != nil {
		if c, err := h.Geo.GetCityByID(r.Context(), req.CityID); err == nil && c != nil {
			in.City = c.Name
		}
	}
	if in.Name == "" && h.Guides != nil {
		if g, err := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context())); err == nil && g != nil {
			in.Name = g.DisplayName
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 50*time.Second)
	defer cancel()
	text, err := h.AIWriter.Improve(ctx, in)
	if err != nil {
		switch {
		case errors.Is(err, aiwriter.ErrBadKind):
			response.Error(w, r, apperrors.ErrValidation)
		case errors.Is(err, aiwriter.ErrTooShort):
			response.Error(w, r, errAITextTooShort)
		case errors.Is(err, aiwriter.ErrTooLong):
			response.Error(w, r, errAITextTooLong)
		case errors.Is(err, aiwriter.ErrNotConfigured):
			response.Error(w, r, errAIUnavailable)
		case errors.Is(err, aiwriter.ErrResultTooLong):
			response.Error(w, r, errAIResultTooLong)
		default:
			if h.Log != nil {
				h.Log.Warn("ai improve text failed", "kind", in.Kind, "user_id", middleware.UserIDFromContext(r.Context()), "error", err)
			}
			response.Error(w, r, errAIFailed)
		}
		return
	}
	response.JSON(w, r, http.StatusOK, map[string]string{"text": text})
}
