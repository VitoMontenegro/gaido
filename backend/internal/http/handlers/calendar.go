package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

func parseDateQuery(raw string) (*time.Time, error) {
	raw = raw[:min(len(raw), 10)]
	if len(raw) != 10 {
		return nil, apperrors.ErrValidation
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, apperrors.ErrValidation
	}
	return &t, nil
}

func monthRange(year int, month time.Month) (time.Time, time.Time) {
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	return start, end
}

func (h *Handlers) ListExcursionDatesPublic(w http.ResponseWriter, r *http.Request) {
	e, err := h.getExcursionViewByRef(r.Context(), chi.URLParam(r, "slug"))
	if err != nil || !h.canViewExcursion(r.Context(), e) {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}

	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	month, _ := strconv.Atoi(r.URL.Query().Get("month"))
	monthsAhead, _ := strconv.Atoi(r.URL.Query().Get("months"))

	var from, to time.Time
	if monthsAhead > 0 {
		if monthsAhead > 12 {
			monthsAhead = 12
		}
		from = time.Now().UTC()
		to = from.AddDate(0, monthsAhead, 0)
	} else {
		if year <= 0 || month < 1 || month > 12 {
			now := time.Now().UTC()
			year, month = now.Year(), int(now.Month())
		}
		from, to = monthRange(year, time.Month(month))
	}

	var items []map[string]any
	source := "guide"

	if e.Type == "GROUP" {
		source = "excursion"
		dates, err := h.Calendar.ListUpcomingExcursionDates(r.Context(), e.ID, from, to)
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		for _, d := range dates {
			items = append(items, map[string]any{
				"id": d.ID, "starts_at": d.StartsAt, "ends_at": d.EndsAt,
				"price": e.PriceFrom, "currency": e.Currency,
			})
		}
	} else {
		dates, err := h.Calendar.ListUpcomingByGuide(r.Context(), e.GuideID, from, to)
		if err != nil {
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		for _, d := range dates {
			items = append(items, map[string]any{
				"id": d.ID, "starts_at": d.StartsAt, "ends_at": d.EndsAt,
				"price": e.PriceFrom, "currency": e.Currency,
			})
		}
	}

	if items == nil {
		items = []map[string]any{}
	}
	response.JSON(w, r, 200, map[string]any{
		"items": items, "source": source, "year": year, "month": month,
	})
}

func (h *Handlers) ListMyExcursionDates(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	excID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	exc, err := h.Exc.GetByID(r.Context(), excID)
	if err != nil || exc == nil || exc.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if exc.Type != "GROUP" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	dates, err := h.Calendar.ListExcursionDates(r.Context(), excID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	items := dates
	if items == nil {
		items = []postgres.ExcursionDate{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) CreateExcursionDate(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	excID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	exc, err := h.Exc.GetByID(r.Context(), excID)
	if err != nil || exc == nil || exc.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if exc.Type != "GROUP" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	var req struct {
		Date string `json:"date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Date == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	day, err := time.Parse("2006-01-02", req.Date[:min(len(req.Date), 10)])
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	duration := exc.DurationMinutes
	if duration <= 0 {
		duration = 180
	}
	start := time.Date(day.Year(), day.Month(), day.Day(), 10, 0, 0, 0, time.UTC)
	end := start.Add(time.Duration(duration) * time.Minute)
	id, err := h.Calendar.CreateExcursionDate(r.Context(), excID, start, end)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if id == 0 {
		response.JSON(w, r, 200, map[string]string{"status": "exists"})
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

func (h *Handlers) DeleteExcursionDate(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	excID, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	dateID, _ := strconv.ParseInt(chi.URLParam(r, "dateId"), 10, 64)
	exc, err := h.Exc.GetByID(r.Context(), excID)
	if err != nil || exc == nil || exc.GuideID != g.ID {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if err := h.Calendar.DeleteExcursionDate(r.Context(), excID, dateID); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "deleted"})
}

func (h *Handlers) CreateSlotByDate(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		Date            string `json:"date"`
		DurationMinutes int    `json:"duration_minutes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Date == "" {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	day, err := time.Parse("2006-01-02", req.Date[:min(len(req.Date), 10)])
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	duration := req.DurationMinutes
	if duration <= 0 {
		duration = 180
	}
	start := time.Date(day.Year(), day.Month(), day.Day(), 10, 0, 0, 0, time.UTC)
	end := start.Add(time.Duration(duration) * time.Minute)
	id, err := h.Calendar.Create(r.Context(), g.ID, start, end, "")
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 201, map[string]int64{"id": id})
}

// SetCalendarDays serves both the shared guide calendar and group excursion dates.
func (h *Handlers) SetCalendarDays(w http.ResponseWriter, r *http.Request) {
	g, _ := h.Guides.GetByUserID(r.Context(), middleware.UserIDFromContext(r.Context()))
	if g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	var req struct {
		Dates    []string `json:"dates"`
		Selected *bool    `json:"selected"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil || req.Selected == nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	days, err := parseCalendarDays(req.Dates)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	var excursionID int64
	duration := 180
	if rawID := chi.URLParam(r, "id"); rawID != "" {
		excursionID, err = strconv.ParseInt(rawID, 10, 64)
		if err != nil || excursionID <= 0 {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
		exc, err := h.Exc.GetByID(r.Context(), excursionID)
		if err != nil || exc == nil || exc.GuideID != g.ID {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		if exc.Type != "GROUP" {
			response.Error(w, r, apperrors.ErrValidation)
			return
		}
		if exc.DurationMinutes > 0 {
			duration = exc.DurationMinutes
		}
	}
	if err := h.Calendar.SetDays(r.Context(), g.ID, excursionID, days, *req.Selected, duration); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "saved"})
}

func parseCalendarDays(keys []string) ([]time.Time, error) {
	if len(keys) == 0 || len(keys) > 31 {
		return nil, apperrors.ErrValidation
	}
	days := make([]time.Time, 0, len(keys))
	seen := make(map[string]bool)
	for _, key := range keys {
		day, err := time.Parse("2006-01-02", key)
		if err != nil || (len(days) > 0 && (day.Year() != days[0].Year() || day.Month() != days[0].Month())) {
			return nil, apperrors.ErrValidation
		}
		if !seen[key] {
			days = append(days, day)
			seen[key] = true
		}
	}
	return days, nil
}
