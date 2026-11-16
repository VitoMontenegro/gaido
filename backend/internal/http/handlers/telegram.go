package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"

	tgsvc "github.com/vitomonte/experts-tourister/internal/service/telegram"
)

func (h *Handlers) TelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if h.Telegram == nil || !h.Telegram.Enabled() {
		http.NotFound(w, r)
		return
	}

	// Without a secret anyone can POST a fake "manager reply" and make the bot
	// message any client. Refuse updates until TELEGRAM_WEBHOOK_SECRET is set.
	secret := h.Cfg.TelegramWebhookSecret
	if secret == "" {
		h.Log.Error("telegram webhook rejected: TELEGRAM_WEBHOOK_SECRET is not set")
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	got := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
	if subtle.ConstantTimeCompare([]byte(got), []byte(secret)) != 1 {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var update tgsvc.Update
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if err := h.Telegram.ProcessUpdate(r.Context(), update); err != nil {
		h.Log.Warn("telegram webhook processing failed", "error", err)
		http.Error(w, "processing error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
