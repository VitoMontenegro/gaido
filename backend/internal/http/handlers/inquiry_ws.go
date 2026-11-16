package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gorilla/websocket"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
)

// inquiryWSMaxMessageBytes bounds a single client frame. The text limit
// (4000 runes) is at most 16 KB of UTF-8 plus JSON overhead.
const inquiryWSMaxMessageBytes = 32 * 1024

func (h *Handlers) inquiryUpgrader() *websocket.Upgrader {
	return &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			// Non-browser clients send no Origin; browsers must come from our sites.
			return origin == "" || h.originAllowed(origin)
		},
	}
}

func (h *Handlers) InquiryWebSocket(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	conn, err := h.inquiryUpgrader().Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(inquiryWSMaxMessageBytes)
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
		payload, err := h.inquiryMessagesPayload(ctx, in, role, after, 200)
		if err != nil {
			return err
		}
		if items, _ := payload["items"].([]domain.InquiryMessage); len(items) > 0 {
			after = items[len(items)-1].ID
		}
		// A stalled client must not block this goroutine forever.
		_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		return conn.WriteJSON(payload)
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
			uid := middleware.UserIDFromContext(ctx)
			if err := h.insertInquiryWSMessage(ctx, in.ID, uid, role, req.Body); err != nil {
				h.Log.Debug("inquiry ws message rejected", "inquiry_id", in.ID, "error", err)
				continue
			}
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

// insertInquiryWSMessage applies the same rules as PostInquiryMessage:
// non-empty text up to 4000 runes, inquiry still open (re-read from the DB,
// since a socket can outlive the status it was opened with), funnel and
// notifications for the other side.
func (h *Handlers) insertInquiryWSMessage(ctx context.Context, inquiryID, uid int64, role, rawBody string) error {
	body := strings.TrimSpace(rawBody)
	if body == "" {
		return errors.New("empty message")
	}
	if utf8.RuneCountInString(body) > 4000 {
		return errors.New("message too long")
	}
	in, err := h.Inquiries.Get(ctx, inquiryID, uid)
	if err != nil {
		return err
	}
	if in == nil {
		return errors.New("inquiry not found")
	}
	if !domain.InquiryIsOpen(in.Status) {
		return errors.New("inquiry closed")
	}
	msg := &domain.InquiryMessage{
		InquiryID:    in.ID,
		AuthorUserID: &uid,
		AuthorRole:   role,
		Kind:         domain.InquiryKindText,
		Body:         body,
	}
	if err := h.Inquiries.InsertMessage(ctx, msg); err != nil {
		return err
	}
	if role == domain.InquiryAuthorGuide {
		wasFirst := in.FirstGuideReplyAt == nil
		_ = h.Inquiries.MarkGuideReplied(ctx, in.ID)
		if wasFirst {
			_ = h.Inquiries.InsertFunnel(ctx, in.GuideID, in.ExcursionID, &uid, "", domain.FunnelFirstGuideReply, false)
		}
	} else {
		_ = h.Inquiries.TouchDiscussing(ctx, in.ID)
	}
	payload, _ := json.Marshal(map[string]any{"inquiry_id": in.ID})
	targets := map[int64]struct{}{in.TouristUserID: {}, in.GuideUserID: {}}
	delete(targets, uid)
	for tid := range targets {
		_ = h.CreateNotification(ctx, tid, "INQUIRY_MESSAGE", string(payload))
	}
	h.publishInquiry(ctx, in.ID)
	return nil
}
