package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
	"github.com/vitomonte/experts-tourister/internal/impersonate"
)

func hasAnyRole(roles []string, want ...string) bool {
	for _, r := range roles {
		for _, w := range want {
			if r == w {
				return true
			}
		}
	}
	return false
}

func parseInquiryID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, apperrors.ErrValidation
	}
	return id, nil
}

func parseOptDate(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func parseOptDateTime(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	layouts := []string{time.RFC3339, "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04:05", "2006-01-02T15:04"}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return parseOptDate(s)
}

func (h *Handlers) inquiryRole(ctx context.Context, in *domain.Inquiry, uid int64, roles []string) string {
	if in == nil || uid == 0 {
		return ""
	}
	if uid == in.TouristUserID {
		return domain.InquiryAuthorTourist
	}
	if uid == in.GuideUserID {
		return domain.InquiryAuthorGuide
	}
	if hasAnyRole(roles, domain.RoleAdmin, domain.RoleModerator) {
		return domain.InquiryAuthorAdmin
	}
	return ""
}

func (h *Handlers) loadInquiry(w http.ResponseWriter, r *http.Request) (*domain.Inquiry, string, bool) {
	id, err := parseInquiryID(r)
	if err != nil {
		response.Error(w, r, err)
		return nil, "", false
	}
	uid := middleware.UserIDFromContext(r.Context())
	in, err := h.Inquiries.Get(r.Context(), id, uid)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return nil, "", false
	}
	if in == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return nil, "", false
	}
	role := h.inquiryRole(r.Context(), in, uid, middleware.RolesFromContext(r.Context()))
	if role == "" {
		response.Error(w, r, apperrors.ErrForbidden)
		return nil, "", false
	}
	return in, role, true
}

func (h *Handlers) publishInquiry(ctx context.Context, inquiryID int64) {
	_ = h.Redis.Signal.Publish(ctx, "inquiry-chat:"+strconv.FormatInt(inquiryID, 10), "1").Err()
}

func inquiryPeerUserID(in *domain.Inquiry, role string) int64 {
	if in == nil {
		return 0
	}
	switch role {
	case domain.InquiryAuthorTourist:
		return in.GuideUserID
	case domain.InquiryAuthorGuide:
		return in.TouristUserID
	default:
		return 0
	}
}

func (h *Handlers) fillPeerLastRead(ctx context.Context, in *domain.Inquiry, role string) {
	if in == nil {
		return
	}
	peer := inquiryPeerUserID(in, role)
	if peer == 0 {
		in.PeerLastReadID = 0
		return
	}
	id, err := h.Inquiries.PeerLastRead(ctx, in.ID, peer)
	if err != nil {
		return
	}
	in.PeerLastReadID = id
}

func (h *Handlers) inquiryMessagesPayload(ctx context.Context, in *domain.Inquiry, role string, after int64, limit int) (map[string]any, error) {
	include := role == domain.InquiryAuthorAdmin
	items, err := h.Inquiries.ListMessages(ctx, in.ID, after, include, limit)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.InquiryMessage{}
	}
	h.fillPeerLastRead(ctx, in, role)
	return map[string]any{"items": items, "peer_last_read_id": in.PeerLastReadID}, nil
}

type createInquiryReq struct {
	GuideID       int64  `json:"guide_id"`
	ExcursionID   *int64 `json:"excursion_id"`
	PreferredDate string `json:"preferred_date"`
	DateFrom      string `json:"date_from"`
	DateTo        string `json:"date_to"`
	PartySize     int    `json:"party_size"`
	Language      string `json:"language"`
	Notes         string `json:"notes"`
}

func (h *Handlers) CreateInquiry(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	var req createInquiryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if req.GuideID <= 0 {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Вкажіть гіда", 400))
		return
	}
	g, err := h.Guides.GetByID(r.Context(), req.GuideID)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrNotFound)
		return
	}
	if g.UserID == uid {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Не можна створити заявку до власного профілю", 400))
		return
	}
	if g.Status == domain.GuideStatusBlocked {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	if req.ExcursionID != nil && *req.ExcursionID > 0 {
		exc, err := h.Exc.GetViewByID(r.Context(), *req.ExcursionID)
		if err != nil || exc == nil || exc.GuideID != g.ID || exc.Status != domain.ExcursionPublished {
			response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Екскурсію не знайдено", 400))
			return
		}
	} else {
		req.ExcursionID = nil
	}
	if req.PartySize <= 0 {
		req.PartySize = 1
	}
	if req.PartySize > domain.MaxGuestsCap {
		req.PartySize = domain.MaxGuestsCap
	}
	notes := strings.TrimSpace(req.Notes)
	if utf8.RuneCountInString(notes) > 2000 {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Побажання — максимум 2000 символів", 400))
		return
	}
	lang := strings.TrimSpace(req.Language)
	if utf8.RuneCountInString(lang) > 80 {
		lang = string([]rune(lang)[:80])
	}
	existing, err := h.Inquiries.FindOpen(r.Context(), uid, g.ID, req.ExcursionID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if existing != nil {
		response.JSON(w, r, 200, existing)
		return
	}
	in := &domain.Inquiry{
		TouristUserID: uid,
		GuideID:       g.ID,
		ExcursionID:   req.ExcursionID,
		Status:        domain.InquiryNew,
		PreferredDate: parseOptDate(req.PreferredDate),
		DateFrom:      parseOptDate(req.DateFrom),
		DateTo:        parseOptDate(req.DateTo),
		PartySize:     req.PartySize,
		Language:      lang,
		Notes:         notes,
	}
	if err := h.Inquiries.Create(r.Context(), in); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	sys := &domain.InquiryMessage{
		InquiryID:  in.ID,
		AuthorRole: domain.InquiryAuthorSystem,
		Kind:       domain.InquiryKindSystem,
		Body:       "Заявку створено. Це спільний чат туриста, гіда і підтримки Gaido. Адміністрація підключається за запитом, а не відповідає на кожне повідомлення.",
	}
	_ = h.Inquiries.InsertMessage(r.Context(), sys)
	if notes != "" {
		uidCopy := uid
		_ = h.Inquiries.InsertMessage(r.Context(), &domain.InquiryMessage{
			InquiryID:    in.ID,
			AuthorUserID: &uidCopy,
			AuthorRole:   domain.InquiryAuthorTourist,
			Kind:         domain.InquiryKindText,
			Body:         notes,
		})
	}
	_ = h.Inquiries.MarkRead(r.Context(), in.ID, uid, sys.ID)
	payload, _ := json.Marshal(map[string]any{"inquiry_id": in.ID, "guide_id": g.ID})
	_ = h.CreateNotification(r.Context(), g.UserID, "INQUIRY_NEW", string(payload))
	_ = h.Inquiries.InsertFunnel(r.Context(), g.ID, req.ExcursionID, &uid, "", domain.FunnelInquiryCreated, false)
	out, _ := h.Inquiries.Get(r.Context(), in.ID, uid)
	if out == nil {
		out = in
	}
	response.JSON(w, r, 201, out)
}

func (h *Handlers) ListMyInquiries(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	filter := r.URL.Query().Get("status")
	items, err := h.Inquiries.List(r.Context(), uid, 0, filter, uid, 50, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Inquiry{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) ListGuideInquiries(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	g, err := h.Guides.GetByUserID(r.Context(), uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	filter := r.URL.Query().Get("status")
	items, err := h.Inquiries.List(r.Context(), 0, g.ID, filter, uid, 50, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Inquiry{}
	}
	counts, err := h.Inquiries.CountBuckets(r.Context(), 0, g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"items": items, "counts": counts})
}

func (h *Handlers) GetInquiry(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	if role == domain.InquiryAuthorAdmin {
		_ = h.Inquiries.LogAdmin(r.Context(), in.ID, uid, "view")
	}
	h.fillPeerLastRead(r.Context(), in, role)
	response.JSON(w, r, 200, in)
}

func (h *Handlers) PatchInquiry(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	var req struct {
		Status         *string `json:"status"`
		ScheduledAt    *string `json:"scheduled_at"`
		ScheduledEndAt *string `json:"scheduled_end_at"`
		CancelReason   *string `json:"cancel_reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	next := in.Status
	if req.Status != nil {
		next = domain.NormalizeInquiryStatus(strings.TrimSpace(*req.Status))
	}
	if req.ScheduledAt != nil && strings.TrimSpace(*req.ScheduledAt) != "" && req.Status == nil {
		if next == domain.InquiryNew || next == domain.InquiryDiscussing {
			next = domain.InquiryPending
		}
	}
	if !domain.ValidInquiryStatus(next) {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if !domain.CanChangeInquiryStatus(in.Status, next, role) {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}

	reason := strings.TrimSpace(in.CancelReason)
	if req.CancelReason != nil {
		reason = strings.TrimSpace(*req.CancelReason)
	}
	if utf8.RuneCountInString(reason) > 500 {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Причина — максимум 500 символів", 400))
		return
	}
	if next == domain.InquiryCancelled && utf8.RuneCountInString(reason) < 3 {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Вкажіть причину скасування", 400))
		return
	}

	start := in.ScheduledAt
	end := in.ScheduledEndAt
	if req.ScheduledAt != nil {
		start = parseOptDateTime(*req.ScheduledAt)
	}
	if req.ScheduledEndAt != nil {
		end = parseOptDateTime(*req.ScheduledEndAt)
	}
	if start != nil && end == nil {
		mins := in.ExcursionDurationMinutes
		if mins <= 0 {
			mins = 120
		}
		e := start.Add(time.Duration(mins) * time.Minute)
		end = &e
	}
	if start != nil && end != nil && !end.After(*start) {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Час завершення має бути пізніше початку", 400))
		return
	}
	if domain.InquiryNeedsSchedule(next) && start == nil {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Вкажіть дату і час у календарі", 400))
		return
	}
	if start != nil && end != nil && (next == domain.InquiryPending || next == domain.InquiryBooked) {
		overlap, err := h.Inquiries.HasScheduleOverlap(r.Context(), in.GuideID, in.ID, *start, *end)
		if err != nil {
			h.Log.Error("inquiry overlap", "err", err)
			response.Error(w, r, apperrors.ErrInternal)
			return
		}
		if overlap {
			response.Error(w, r, apperrors.New("VALIDATION_ERROR", "На цей час уже є бронь або очікування підтвердження", 400))
			return
		}
	}

	in.Status = next
	in.ScheduledAt = start
	in.ScheduledEndAt = end
	if start != nil {
		day := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
		in.PreferredDate = &day
	}
	if next == domain.InquiryCancelled {
		in.CancelReason = reason
		in.CancelledBy = role
	}
	if err := h.Inquiries.UpdateCRM(r.Context(), in); err != nil {
		h.Log.Error("inquiry update crm", "err", err)
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	sys := &domain.InquiryMessage{
		InquiryID:  in.ID,
		AuthorRole: domain.InquiryAuthorSystem,
		Kind:       domain.InquiryKindSystem,
		Body:       inquiryStatusSystemText(next, reason, start),
	}
	_ = h.Inquiries.InsertMessage(r.Context(), sys)
	h.publishInquiry(r.Context(), in.ID)
	payload, _ := json.Marshal(map[string]any{"inquiry_id": in.ID, "status": next})
	h.notifyInquiryPeers(r.Context(), in, role, "INQUIRY_UPDATE", string(payload))
	out, _ := h.Inquiries.Get(r.Context(), in.ID, middleware.UserIDFromContext(r.Context()))
	response.JSON(w, r, 200, out)
}

func (h *Handlers) notifyInquiryPeers(ctx context.Context, in *domain.Inquiry, actorRole, ntype, payload string) {
	if actorRole != domain.InquiryAuthorTourist {
		_ = h.CreateNotification(ctx, in.TouristUserID, ntype, payload)
	}
	if actorRole != domain.InquiryAuthorGuide && in.GuideUserID > 0 {
		_ = h.CreateNotification(ctx, in.GuideUserID, ntype, payload)
	}
}

func inquiryStatusSystemText(status, reason string, start *time.Time) string {
	when := ""
	if start != nil {
		when = " на " + start.Format("02.01.2006 15:04")
	}
	switch status {
	case domain.InquiryDiscussing:
		return "Заявку переведено в роботу."
	case domain.InquiryPending:
		return "Запропоновано час" + when + ". Очікується підтвердження бронювання."
	case domain.InquiryBooked:
		return "Бронювання підтверджено" + when + "."
	case domain.InquiryDone:
		return "Заявку позначено як виконану."
	case domain.InquiryCancelled:
		if reason != "" {
			return "Заявку скасовано. Причина: " + reason
		}
		return "Заявку скасовано."
	default:
		return "Статус заявки змінено."
	}
}

func (h *Handlers) ListInquiryMessages(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	payload, err := h.inquiryMessagesPayload(r.Context(), in, role, after, 200)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, payload)
}

func (h *Handlers) LongpollInquiryMessages(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	timeout, _ := strconv.Atoi(r.URL.Query().Get("timeout"))
	if timeout <= 0 || timeout > 25 {
		timeout = 25
	}
	ctx := r.Context()
	payload, err := h.inquiryMessagesPayload(ctx, in, role, after, 200)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items, _ := payload["items"].([]domain.InquiryMessage); len(items) > 0 {
		response.JSON(w, r, 200, payload)
		return
	}
	sub := h.Redis.Signal.Subscribe(ctx, "inquiry-chat:"+strconv.FormatInt(in.ID, 10))
	defer sub.Close()
	timer := time.NewTimer(time.Duration(timeout) * time.Second)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		response.JSON(w, r, 200, payload)
	case <-timer.C:
		payload, _ = h.inquiryMessagesPayload(ctx, in, role, after, 200)
		response.JSON(w, r, 200, payload)
	case <-sub.Channel():
		payload, _ = h.inquiryMessagesPayload(ctx, in, role, after, 200)
		response.JSON(w, r, 200, payload)
	}
}

type postMessageReq struct {
	Body string `json:"body"`
	Kind string `json:"kind"`
}

func (h *Handlers) PostInquiryMessage(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	var req postMessageReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	body := strings.TrimSpace(req.Body)
	if body == "" {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Напишіть повідомлення", 400))
		return
	}
	if utf8.RuneCountInString(body) > 4000 {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Повідомлення — максимум 4000 символів", 400))
		return
	}
	kind := domain.InquiryKindText
	if req.Kind == domain.InquiryKindInternalNote {
		if role != domain.InquiryAuthorAdmin {
			response.Error(w, r, apperrors.ErrForbidden)
			return
		}
		kind = domain.InquiryKindInternalNote
	}
	if !domain.InquiryIsOpen(in.Status) && kind != domain.InquiryKindInternalNote {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Заявку вже закрито", 400))
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	msg := &domain.InquiryMessage{
		InquiryID:    in.ID,
		AuthorUserID: &uid,
		AuthorRole:   role,
		Kind:         kind,
		Body:         body,
	}
	if err := h.Inquiries.InsertMessage(r.Context(), msg); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if kind != domain.InquiryKindInternalNote {
		if role == domain.InquiryAuthorGuide {
			wasFirst := in.FirstGuideReplyAt == nil
			_ = h.Inquiries.MarkGuideReplied(r.Context(), in.ID)
			if wasFirst {
				_ = h.Inquiries.InsertFunnel(r.Context(), in.GuideID, in.ExcursionID, &uid, "", domain.FunnelFirstGuideReply, false)
			}
		} else {
			_ = h.Inquiries.TouchDiscussing(r.Context(), in.ID)
		}
		payload, _ := json.Marshal(map[string]any{"inquiry_id": in.ID})
		targets := map[int64]struct{}{in.TouristUserID: {}, in.GuideUserID: {}}
		delete(targets, uid)
		for tid := range targets {
			_ = h.CreateNotification(r.Context(), tid, "INQUIRY_MESSAGE", string(payload))
		}
		h.publishInquiry(r.Context(), in.ID)
	}
	items, _ := h.Inquiries.ListMessages(r.Context(), in.ID, msg.ID-1, role == domain.InquiryAuthorAdmin, 1)
	if len(items) > 0 {
		response.JSON(w, r, 201, items[0])
		return
	}
	response.JSON(w, r, 201, msg)
}

func (h *Handlers) RequestInquiryHelp(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	if role == domain.InquiryAuthorAdmin {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	help := true
	if err := h.Inquiries.UpdateStatus(r.Context(), in.ID, in.Status, &help); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	msg := &domain.InquiryMessage{
		InquiryID:  in.ID,
		AuthorRole: domain.InquiryAuthorSystem,
		Kind:       domain.InquiryKindSystem,
		Body:       "Учасник попросив допомогу підтримки Gaido.",
	}
	_ = h.Inquiries.InsertMessage(r.Context(), msg)
	payload, _ := json.Marshal(map[string]any{"inquiry_id": in.ID})
	h.NotifyAdmins(r.Context(), "INQUIRY_HELP", string(payload))
	h.publishInquiry(r.Context(), in.ID)
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) MarkInquiryRead(w http.ResponseWriter, r *http.Request) {
	in, _, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	var req struct {
		LastID int64 `json:"last_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.LastID <= 0 {
		response.JSON(w, r, 200, map[string]string{"status": "ok"})
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	_ = h.Inquiries.MarkRead(r.Context(), in.ID, uid, req.LastID)
	h.publishInquiry(r.Context(), in.ID)
	response.JSON(w, r, 200, map[string]string{"status": "ok"})
}

func (h *Handlers) UploadInquiryAttachment(w http.ResponseWriter, r *http.Request) {
	in, role, ok := h.loadInquiry(w, r)
	if !ok {
		return
	}
	if role == domain.InquiryAuthorAdmin {
		// admin may attach too
	}
	if !domain.InquiryIsOpen(in.Status) {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Заявку вже закрито", 400))
		return
	}
	if err := r.ParseMultipartForm(h.Cfg.MediaMaxUploadBytes + 1024); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	defer file.Close()
	mime := hdr.Header.Get("Content-Type")
	_, pub, _, err := h.Media.SaveUpload(file, mime, h.Cfg.MediaMaxUploadBytes)
	if err != nil {
		response.Error(w, r, apperrors.New("VALIDATION_ERROR", "Не вдалося завантажити файл", 400))
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	msg := &domain.InquiryMessage{
		InquiryID:    in.ID,
		AuthorUserID: &uid,
		AuthorRole:   role,
		Kind:         domain.InquiryKindAttachment,
		Body:         strings.TrimSpace(r.FormValue("caption")),
		MediaKey:     pub,
	}
	if err := h.Inquiries.InsertMessage(r.Context(), msg); err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if role == domain.InquiryAuthorGuide {
		_ = h.Inquiries.MarkGuideReplied(r.Context(), in.ID)
	} else if role != domain.InquiryAuthorAdmin {
		_ = h.Inquiries.TouchDiscussing(r.Context(), in.ID)
	}
	h.publishInquiry(r.Context(), in.ID)
	items, _ := h.Inquiries.ListMessages(r.Context(), in.ID, msg.ID-1, role == domain.InquiryAuthorAdmin, 1)
	if len(items) > 0 {
		response.JSON(w, r, 201, items[0])
		return
	}
	response.JSON(w, r, 201, msg)
}

func (h *Handlers) ListGuideClients(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	g, err := h.Guides.GetByUserID(r.Context(), uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	items, err := h.Inquiries.ListClients(r.Context(), g.ID)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.InquiryClient{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) GuideAgenda(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	g, err := h.Guides.GetByUserID(r.Context(), uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	from := time.Now().UTC().Truncate(24 * time.Hour)
	to := from.AddDate(0, 2, 0)
	if ds := r.URL.Query().Get("from"); ds != "" {
		if t := parseOptDate(ds); t != nil {
			from = *t
		}
	}
	if ds := r.URL.Query().Get("to"); ds != "" {
		if t := parseOptDate(ds); t != nil {
			to = *t
		}
	}
	items, err := h.Inquiries.ListAgenda(r.Context(), g.ID, from, to)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Inquiry{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) GuideInquiryStats(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	g, err := h.Guides.GetByUserID(r.Context(), uid)
	if err != nil || g == nil {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	to := time.Now().UTC().Add(24 * time.Hour)
	from := to.AddDate(0, 0, -30)
	if ds := r.URL.Query().Get("from"); ds != "" {
		if t := parseOptDate(ds); t != nil {
			from = *t
		}
	}
	if ds := r.URL.Query().Get("to"); ds != "" {
		if t := parseOptDate(ds); t != nil {
			to = t.Add(24 * time.Hour)
		}
	}
	st, err := h.Inquiries.FunnelStats(r.Context(), g.ID, from, to)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, st)
}

func (h *Handlers) AdminListInquiries(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	filter := r.URL.Query().Get("queue")
	if filter == "" {
		filter = "help"
	}
	items, err := h.Inquiries.List(r.Context(), 0, 0, filter, uid, 50, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.Inquiry{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

type funnelReq struct {
	GuideID     int64  `json:"guide_id"`
	ExcursionID *int64 `json:"excursion_id"`
	EventType   string `json:"event_type"`
	SessionKey  string `json:"session_key"`
	ContactType string `json:"contact_type"`
}

func (h *Handlers) TrackGuideEvent(w http.ResponseWriter, r *http.Request) {
	var req funnelReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.GuideID <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	unique := false
	switch req.EventType {
	case domain.FunnelProfileView, domain.FunnelExcursionView:
		unique = true
	case domain.FunnelContactClick:
		unique = false
	default:
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	g, err := h.Guides.GetByID(r.Context(), req.GuideID)
	if err != nil || g == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	var userPtr *int64
	if uid > 0 {
		userPtr = &uid
	}
	// Свой профиль гид не засчитывает ни в визиты, ни в клики.
	// Админ и сессия «войти как гид» не попадают только в визиты профиля и экскурсий.
	if uid > 0 && uid == g.UserID {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if unique && internalFunnelViewer(r.Context(), uid, g.UserID) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	session := strings.TrimSpace(req.SessionKey)
	if utf8.RuneCountInString(session) > 64 {
		session = session[:64]
	}
	_ = h.Inquiries.InsertFunnel(r.Context(), g.ID, req.ExcursionID, userPtr, session, req.EventType, unique)
	w.WriteHeader(http.StatusNoContent)
}

// internalFunnelViewer — сам гид, администратор или админ в режиме «войти как гид».
func internalFunnelViewer(ctx context.Context, viewerID, guideUserID int64) bool {
	if viewerID > 0 && viewerID == guideUserID {
		return true
	}
	if impersonate.FromContext(ctx) != nil {
		return true
	}
	return hasAnyRole(middleware.RolesFromContext(ctx), domain.RoleAdmin)
}
