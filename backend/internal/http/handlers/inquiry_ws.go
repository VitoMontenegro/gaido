package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
)

var inquiryUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Handlers) InquiryWebSocket(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	conn, err := inquiryUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	include := role == domain.InquiryAuthorAdmin
	after := int64(0)
	if v := r.URL.Query().Get("after"); v != "" {
		after, _ = strconv.ParseInt(v, 10, 64)
	}
	ctx := r.Context()
	sub := h.Redis.Signal.Subscribe(ctx, "inquiry-chat:"+strconv.FormatInt(in.ID, 10))
	defer sub.Close()

	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	flush := func() error {
		items, err := h.Inquiries.ListMessages(ctx, in.ID, after, include, 200)
		if err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		after = items[len(items)-1].ID
		return conn.WriteJSON(map[string]any{"items": items})
	}
	if err := flush(); err != nil {
		return
	}

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			_, data, err := conn.ReadMessage()
			if err != nil {
				return
			}
			var req postMessageReq
			if json.Unmarshal(data, &req) != nil {
				continue
			}
			body := strings.TrimSpace(req.Body)
			if body == "" {
				continue
			}
			uid := middleware.UserIDFromContext(ctx)
			msg := &domain.InquiryMessage{
				InquiryID:    in.ID,
				AuthorUserID: &uid,
				AuthorRole:   role,
				Kind:         domain.InquiryKindText,
				Body:         body,
			}
			if err := h.Inquiries.InsertMessage(ctx, msg); err != nil {
				continue
			}
			if role == domain.InquiryAuthorGuide {
				_ = h.Inquiries.MarkGuideReplied(ctx, in.ID)
			} else if role != domain.InquiryAuthorAdmin {
				_ = h.Inquiries.TouchDiscussing(ctx, in.ID)
			}
			h.publishInquiry(ctx, in.ID)
		}
	}()

	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := conn.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second)); err != nil {
				return
			}
		case <-sub.Channel():
			if err := flush(); err != nil {
				return
			}
		}
	}
}
