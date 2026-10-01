package news

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

func NewRewriter(apiKey, model string) Rewriter {
	return newOpenAIClient(apiKey, model)
}

type openAIClient struct {
	apiKey string
	model  string
	http   *http.Client
}

func newOpenAIClient(apiKey, model string) *openAIClient {
	if model == "" {
		model = "gpt-4o-mini"
	}
	return &openAIClient{
		apiKey: apiKey,
		model:  model,
		http:   &http.Client{Timeout: 60 * time.Second},
	}
}

type chatRequest struct {
	Model          string         `json:"model"`
	ResponseFormat map[string]any `json:"response_format"`
	Messages       []chatMessage  `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *openAIClient) Rewrite(ctx context.Context, src SourceItem) (*Draft, error) {
	if c.apiKey == "" {
		return nil, fmt.Errorf("openai api key is empty")
	}
	user := fmt.Sprintf("Заголовок: %s\nПосилання: %s\nОпубліковано: %s\nТекст:\n%s",
		src.Title, src.URL, src.Published, src.Text)
	body, err := json.Marshal(chatRequest{
		Model:          c.model,
		ResponseFormat: map[string]any{"type": "json_object"},
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: user},
		},
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, err
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		return nil, fmt.Errorf("openai: %s", parsed.Error.Message)
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("openai http %d", res.StatusCode)
	}
	if len(parsed.Choices) == 0 {
		return nil, fmt.Errorf("openai empty choices")
	}
	return parseDraft(parsed.Choices[0].Message.Content)
}

func parseDraft(raw string) (*Draft, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)
	var d Draft
	if err := json.Unmarshal([]byte(raw), &d); err != nil {
		return nil, fmt.Errorf("openai json: %w", err)
	}
	d.Title = strings.TrimSpace(d.Title)
	d.Excerpt = strings.TrimSpace(d.Excerpt)
	d.Slug = strings.TrimSpace(d.Slug)
	d.Reason = strings.TrimSpace(d.Reason)
	if d.Skip {
		return &d, nil
	}
	if d.Title == "" || strings.TrimSpace(d.BodyHTML) == "" {
		return nil, fmt.Errorf("openai draft missing title or body")
	}
	return &d, nil
}
