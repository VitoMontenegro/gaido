package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

func (h *Handlers) ListNotifications(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	var (
		items []map[string]any
		err   error
	)
	if after > 0 {
		items, err = h.Notif.ListAfter(r.Context(), uid, after, 50)
	} else {
		items, err = h.Notif.ListRecent(r.Context(), uid, 50)
	}
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []map[string]any{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if err := h.Notif.MarkRead(r.Context(), uid, id); err != nil {
		if err == pgx.ErrNoRows {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) Longpoll(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	timeout, _ := strconv.Atoi(r.URL.Query().Get("timeout"))
	if timeout <= 0 || timeout > 25 {
		timeout = 25
	}
	ctx := r.Context()
	items, err := h.Notif.ListAfter(ctx, uid, after, 50)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if len(items) > 0 {
		response.JSON(w, r, 200, map[string]any{"items": items})
		return
	}
	sub := h.Redis.Signal.Subscribe(ctx, "notifications:"+strconv.FormatInt(uid, 10))
	defer sub.Close()
	timer := time.NewTimer(time.Duration(timeout) * time.Second)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		response.JSON(w, r, 200, map[string]any{"items": []any{}})
	case <-timer.C:
		items, _ = h.Notif.ListAfter(ctx, uid, after, 50)
		response.JSON(w, r, 200, map[string]any{"items": items})
	case <-sub.Channel():
		items, _ = h.Notif.ListAfter(ctx, uid, after, 50)
		response.JSON(w, r, 200, map[string]any{"items": items})
	}
}
