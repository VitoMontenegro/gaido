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
	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/http/middleware"
	"github.com/vitomonte/experts-tourister/internal/http/response"
)

const (
	forumTitleMax = 200
	forumBodyMax  = 8000
	forumTitleMin = 3
)

func forumRolesAllowGuides(roles []string) bool {
	for _, role := range roles {
		switch role {
		case domain.RoleGuide, domain.RoleAdmin, domain.RoleModerator:
			return true
		}
	}
	return false
}

func canReadForum(audience string, roles []string) bool {
	if audience != domain.ForumAudienceGuides {
		return true
	}
	return forumRolesAllowGuides(roles)
}

func canWriteForum(audience string, userID int64, roles []string) bool {
	if userID <= 0 {
		return false
	}
	return canReadForum(audience, roles)
}

func applyForumAccess(f *domain.Forum, userID int64, roles []string) {
	if f == nil {
		return
	}
	f.CanRead = canReadForum(f.Audience, roles)
	f.CanWrite = canWriteForum(f.Audience, userID, roles)
	if !f.CanRead {
		f.LastPost = nil
	}
}

func forumFromRequest(r *http.Request) (userID int64, roles []string) {
	return middleware.UserIDFromContext(r.Context()), middleware.RolesFromContext(r.Context())
}

func (h *Handlers) ListForums(w http.ResponseWriter, r *http.Request) {
	items, err := h.Forums.List(r.Context())
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	uid, roles := forumFromRequest(r)
	out := make([]domain.Forum, 0, len(items))
	for i := range items {
		applyForumAccess(&items[i], uid, roles)
		out = append(out, items[i])
	}
	response.JSON(w, r, 200, map[string]any{"items": out})
}

func (h *Handlers) ListRecentForumTopics(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := h.Forums.ListRecentPublicTopics(r.Context(), limit)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if items == nil {
		items = []domain.ForumTopic{}
	}
	response.JSON(w, r, 200, map[string]any{"items": items})
}

func (h *Handlers) GetForum(w http.ResponseWriter, r *http.Request) {
	forum, err := h.Forums.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		if err == pgx.ErrNoRows {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	uid, roles := forumFromRequest(r)
	applyForumAccess(forum, uid, roles)
	if !forum.CanRead {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	topics, err := h.Forums.ListTopics(r.Context(), forum.ID, 50, 0)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if topics == nil {
		topics = []domain.ForumTopic{}
	}
	response.JSON(w, r, 200, map[string]any{"forum": forum, "items": topics})
}

func (h *Handlers) GetForumTopic(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	topic, forum, err := h.loadForumTopic(r, id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	posts, err := h.Forums.ListPostsAfter(r.Context(), topic.ID, 0, 200)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	response.JSON(w, r, 200, map[string]any{"forum": forum, "topic": topic, "items": posts})
}

func (h *Handlers) ForumTopicLongpoll(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	if _, _, err := h.loadForumTopic(r, id); err != nil {
		response.Error(w, r, err)
		return
	}
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	timeout, _ := strconv.Atoi(r.URL.Query().Get("timeout"))
	if timeout <= 0 || timeout > 25 {
		timeout = 25
	}
	ctx := r.Context()
	items, err := h.Forums.ListPostsAfter(ctx, id, after, 50)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	if len(items) > 0 {
		response.JSON(w, r, 200, map[string]any{"items": items})
		return
	}
	sub := h.Redis.Signal.Subscribe(ctx, "forum:topic:"+strconv.FormatInt(id, 10))
	defer sub.Close()
	timer := time.NewTimer(time.Duration(timeout) * time.Second)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		response.JSON(w, r, 200, map[string]any{"items": []any{}})
	case <-timer.C:
		items, _ = h.Forums.ListPostsAfter(ctx, id, after, 50)
		response.JSON(w, r, 200, map[string]any{"items": items})
	case <-sub.Channel():
		items, _ = h.Forums.ListPostsAfter(ctx, id, after, 50)
		response.JSON(w, r, 200, map[string]any{"items": items})
	}
}

func (h *Handlers) CreateForumTopic(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserIDFromContext(r.Context())
	forum, err := h.Forums.GetBySlug(r.Context(), chi.URLParam(r, "slug"))
	if err != nil {
		if err == pgx.ErrNoRows {
			response.Error(w, r, apperrors.ErrNotFound)
			return
		}
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	roles := middleware.RolesFromContext(r.Context())
	if !canWriteForum(forum.Audience, uid, roles) {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	var req struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	title, ok := sanitizeForumTitle(req.Title)
	body, bodyOK := sanitizeForumBody(req.Body)
	if !ok || !bodyOK {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	topic, post, err := h.Forums.CreateTopic(r.Context(), forum.ID, uid, title, body)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.signalForumTopic(topic.ID)
	response.JSON(w, r, 201, map[string]any{"topic": topic, "post": post})
}

func (h *Handlers) CreateForumPost(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	topic, forum, err := h.loadForumTopic(r, id)
	if err != nil {
		response.Error(w, r, err)
		return
	}
	uid := middleware.UserIDFromContext(r.Context())
	if !forum.CanWrite {
		response.Error(w, r, apperrors.ErrForbidden)
		return
	}
	var req struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	body, ok := sanitizeForumBody(req.Body)
	if !ok {
		response.Error(w, r, apperrors.ErrValidation)
		return
	}
	post, err := h.Forums.CreatePost(r.Context(), topic.ID, forum.ID, uid, body)
	if err != nil {
		response.Error(w, r, apperrors.ErrInternal)
		return
	}
	h.signalForumTopic(topic.ID)
	response.JSON(w, r, 201, post)
}

func (h *Handlers) loadForumTopic(r *http.Request, id int64) (*domain.ForumTopic, *domain.Forum, error) {
	topic, err := h.Forums.GetTopic(r.Context(), id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil, apperrors.ErrNotFound
		}
		return nil, nil, apperrors.ErrInternal
	}
	forum := &domain.Forum{
		ID:       topic.ForumID,
		Slug:     topic.ForumSlug,
		Title:    topic.ForumTitle,
		Audience: topic.ForumAudience,
	}
	uid, roles := forumFromRequest(r)
	applyForumAccess(forum, uid, roles)
	if !forum.CanRead {
		return nil, nil, apperrors.ErrForbidden
	}
	return topic, forum, nil
}

func (h *Handlers) signalForumTopic(topicID int64) {
	if h.Redis == nil || h.Redis.Signal == nil || topicID <= 0 {
		return
	}
	_ = h.Redis.Signal.Publish(context.Background(), "forum:topic:"+strconv.FormatInt(topicID, 10), "1").Err()
}

func sanitizeForumTitle(title string) (string, bool) {
	title = strings.Join(strings.Fields(strings.TrimSpace(title)), " ")
	n := utf8.RuneCountInString(title)
	return title, n >= forumTitleMin && n <= forumTitleMax
}

func sanitizeForumBody(body string) (string, bool) {
	body = strings.TrimSpace(body)
	n := utf8.RuneCountInString(body)
	return body, n > 0 && n <= forumBodyMax
}
