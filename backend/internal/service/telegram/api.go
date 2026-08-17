package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const apiBase = "https://api.telegram.org/bot"

type API struct {
	token  string
	client *http.Client
}

func NewAPI(token string) *API {
	return &API{
		token: token,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type Message struct {
	MessageID       int64  `json:"message_id"`
	MessageThreadID int64  `json:"message_thread_id,omitempty"`
	Text            string `json:"text,omitempty"`
	Caption         string `json:"caption,omitempty"`
	Chat            Chat   `json:"chat"`
	From            *User  `json:"from,omitempty"`
	ReplyToMessage  *Message `json:"reply_to_message,omitempty"`
	ForwardOrigin   any    `json:"forward_origin,omitempty"`
	ForwardFrom     any    `json:"forward_from,omitempty"`
	ForwardFromChat any    `json:"forward_from_chat,omitempty"`
	Document        any    `json:"document,omitempty"`
	Photo           []any  `json:"photo,omitempty"`
	Video           any    `json:"video,omitempty"`
	Audio           any    `json:"audio,omitempty"`
	Voice           any    `json:"voice,omitempty"`
	VideoNote       any    `json:"video_note,omitempty"`
	Sticker         any    `json:"sticker,omitempty"`
}

type Chat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

type User struct {
	ID        int64  `json:"id"`
	IsBot     bool   `json:"is_bot,omitempty"`
	Username  string `json:"username,omitempty"`
	FirstName string `json:"first_name,omitempty"`
}

type Update struct {
	UpdateID int64    `json:"update_id"`
	Message  *Message `json:"message,omitempty"`
}

type apiResponse struct {
	OK          bool            `json:"ok"`
	Description string          `json:"description,omitempty"`
	Result      json.RawMessage `json:"result,omitempty"`
}

func (a *API) call(ctx context.Context, method string, payload any) (json.RawMessage, error) {
	var body io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBase+a.token+"/"+method, body)
	if err != nil {
		return nil, err
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var out apiResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if !out.OK {
		if out.Description != "" {
			return nil, fmt.Errorf("telegram %s: %s", method, out.Description)
		}
		return nil, fmt.Errorf("telegram %s failed", method)
	}
	return out.Result, nil
}

func (a *API) SendMessage(ctx context.Context, chatID int64, text string, threadID *int64) (*Message, error) {
	payload := map[string]any{
		"chat_id": chatID,
		"text":    text,
	}
	if threadID != nil && *threadID > 0 {
		payload["message_thread_id"] = *threadID
	}
	raw, err := a.call(ctx, "sendMessage", payload)
	if err != nil {
		return nil, err
	}
	return decodeMessage(raw)
}

func (a *API) ForwardMessage(ctx context.Context, toChatID, fromChatID, messageID int64, threadID *int64) (*Message, error) {
	payload := map[string]any{
		"chat_id":      toChatID,
		"from_chat_id": fromChatID,
		"message_id":   messageID,
	}
	if threadID != nil && *threadID > 0 {
		payload["message_thread_id"] = *threadID
	}
	raw, err := a.call(ctx, "forwardMessage", payload)
	if err != nil {
		return nil, err
	}
	return decodeMessage(raw)
}

func (a *API) CreateForumTopic(ctx context.Context, chatID int64, name string) (int64, error) {
	raw, err := a.call(ctx, "createForumTopic", map[string]any{
		"chat_id": chatID,
		"name":    name,
	})
	if err != nil {
		return 0, err
	}
	var result struct {
		MessageThreadID int64 `json:"message_thread_id"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return 0, err
	}
	return result.MessageThreadID, nil
}

func (a *API) GetChat(ctx context.Context, chatID int64) (isForum bool, err error) {
	raw, err := a.call(ctx, "getChat", map[string]any{"chat_id": chatID})
	if err != nil {
		return false, err
	}
	var result struct {
		IsForum bool `json:"is_forum"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return false, err
	}
	return result.IsForum, nil
}

func (a *API) SetWebhook(ctx context.Context, url, secret string) error {
	payload := map[string]any{"url": url}
	if secret != "" {
		payload["secret_token"] = secret
	}
	_, err := a.call(ctx, "setWebhook", payload)
	return err
}

func (a *API) DeleteWebhook(ctx context.Context) error {
	_, err := a.call(ctx, "deleteWebhook", map[string]any{"drop_pending_updates": false})
	return err
}

func (a *API) GetWebhookInfo(ctx context.Context) (json.RawMessage, error) {
	return a.call(ctx, "getWebhookInfo", nil)
}

func decodeMessage(raw json.RawMessage) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(raw, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

func (m *Message) IsForwarded() bool {
	return m.ForwardOrigin != nil || m.ForwardFrom != nil || m.ForwardFromChat != nil
}

func (m *Message) HasMedia() bool {
	return m.Document != nil || len(m.Photo) > 0 || m.Video != nil ||
		m.Audio != nil || m.Voice != nil || m.VideoNote != nil || m.Sticker != nil
}
