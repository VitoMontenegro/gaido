package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

const (
	wizardEventsMaxBatch = 20
	wizardEventMetaMax   = 2048
	wizardEventsMaxBody  = 64 << 10
)

var wizardEventNames = map[string]bool{
	"wizard_start": true, "wizard_step_view": true, "wizard_next": true, "wizard_next_blocked": true,
	"wizard_soft_skip": true, "autosave_error": true, "draft_resumed": true, "publish_click": true,
}

type wizardEventReq struct {
	Events []struct {
		Event       string          `json:"event"`
		Step        string          `json:"step"`
		SessionID   string          `json:"session_id"`
		ExcursionID *int64          `json:"excursion_id"`
		Meta        json.RawMessage `json:"meta"`
	} `json:"events"`
}

// TrackWizardEvents приймає пачку подій майстра від гіда. Назви — за білим списком, без персональних даних.
func (h *Handlers) TrackWizardEvents(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req wizardEventReq
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, wizardEventsMaxBody)).Decode(&req); err != nil ||
		len(req.Events) == 0 || len(req.Events) > wizardEventsMaxBatch {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	events := make([]postgres.WizardEvent, 0, len(req.Events))
	for _, e := range req.Events {
		if !wizardEventNames[e.Event] || len(e.Meta) > wizardEventMetaMax {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
		events = append(events, postgres.WizardEvent{
			ExcursionID: e.ExcursionID,
			SessionID:   truncateRunes(strings.TrimSpace(e.SessionID), 64),
			Event:       e.Event,
			Step:        truncateRunes(strings.TrimSpace(e.Step), 20),
			Meta:        e.Meta,
		})
	}
	if err := h.WizardEvents.InsertBatch(r.Context(), g.ID, events); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
