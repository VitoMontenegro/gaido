// Package aiwriter rewrites guides' raw notes into polished Ukrainian copy via an LLM.
// It never persists anything: the result goes back into the form for the guide to review.
package aiwriter

import (
	"context"
	"errors"
	"html"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/microcosm-cc/bluemonday"
)

type Kind string

const (
	KindAbout     Kind = "about"
	KindExcursion Kind = "excursion"
)

const (
	MinInputRunes = 30
	MaxInputRunes = 8000

	// AboutTargetRunes keeps the result comfortably under domain.GuideAboutMaxLen (1000).
	AboutTargetRunes = 900
	AboutMaxRunes    = 1000

	ExcursionTargetRunes = 2500
	ExcursionMaxRunes    = 4000
)

var (
	ErrNotConfigured = errors.New("aiwriter: not configured")
	ErrBadKind       = errors.New("aiwriter: unknown kind")
	ErrTooShort      = errors.New("aiwriter: input too short")
	ErrTooLong       = errors.New("aiwriter: input too long")
	ErrResultTooLong = errors.New("aiwriter: result too long")
	ErrEmptyResult   = errors.New("aiwriter: empty result")
)

// Input is the guide's draft plus context the model may mention (never invent beyond it).
type Input struct {
	Kind  Kind
	Text  string // plain text or editor HTML
	Name  string // guide display name
	City  string // city name, nominative
	Title string // excursion title
}

// Completer sends one system+user prompt pair to a chat model.
type Completer interface {
	Complete(ctx context.Context, system, user string) (string, error)
}

type Service struct {
	llm Completer
}

// Options configures any OpenAI-compatible chat API (OpenAI, OpenRouter, ...).
type Options struct {
	APIKey  string
	BaseURL string // e.g. https://api.openai.com/v1 or https://openrouter.ai/api/v1
	Model   string
	SiteURL string // sent as HTTP-Referer (OpenRouter app attribution)
	AppName string // sent as X-Title
}

// New returns a service backed by an OpenAI-compatible API. With an empty key Enabled() is false.
func New(opts Options) *Service {
	if strings.TrimSpace(opts.APIKey) == "" {
		return &Service{}
	}
	return &Service{llm: newOpenAIClient(opts)}
}

// NewWithCompleter is for tests and alternative providers.
func NewWithCompleter(c Completer) *Service { return &Service{llm: c} }

func (s *Service) Enabled() bool { return s != nil && s.llm != nil }

// Improve returns plain text for KindAbout and sanitized HTML for KindExcursion.
func (s *Service) Improve(ctx context.Context, in Input) (string, error) {
	if !s.Enabled() {
		return "", ErrNotConfigured
	}
	if in.Kind != KindAbout && in.Kind != KindExcursion {
		return "", ErrBadKind
	}
	src := PlainText(in.Text)
	n := utf8.RuneCountInString(src)
	if n < MinInputRunes {
		return "", ErrTooShort
	}
	if n > MaxInputRunes {
		return "", ErrTooLong
	}
	in.Text = src
	in.Name = oneLine(in.Name, 120)
	in.City = oneLine(in.City, 120)
	in.Title = oneLine(in.Title, 200)

	raw, err := s.llm.Complete(ctx, systemPrompt(in.Kind), userPrompt(in))
	if err != nil {
		return "", err
	}
	raw = stripFences(raw)
	if in.Kind == KindAbout {
		return finishAbout(raw)
	}
	return finishExcursion(raw)
}

func finishAbout(raw string) (string, error) {
	out := PlainText(raw)
	out = strings.ReplaceAll(out, "**", "")
	if out == "" {
		return "", ErrEmptyResult
	}
	if utf8.RuneCountInString(out) > AboutMaxRunes {
		return "", ErrResultTooLong
	}
	return out, nil
}

var excursionPolicy = func() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements("p", "ul", "ol", "li", "strong", "em", "br")
	return p
}()

func finishExcursion(raw string) (string, error) {
	if !strings.Contains(raw, "<") {
		raw = paragraphsToHTML(raw)
	}
	out := strings.TrimSpace(excursionPolicy.Sanitize(raw))
	text := PlainText(out)
	if text == "" {
		return "", ErrEmptyResult
	}
	if utf8.RuneCountInString(text) > ExcursionMaxRunes {
		return "", ErrResultTooLong
	}
	return out, nil
}

var (
	blockEndRe = regexp.MustCompile(`(?i)</(p|div|li|h[1-6]|ul|ol|blockquote)>|<br\s*/?>`)
	liStartRe  = regexp.MustCompile(`(?i)<li[^>]*>`)
	spacesRe   = regexp.MustCompile(`[^\S\n]+`)
	manyNLRe   = regexp.MustCompile(`\n{3,}`)
	strictText = bluemonday.StrictPolicy()
)

// PlainText turns editor HTML (or plain text) into paragraphs separated by blank lines.
func PlainText(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	if strings.Contains(s, "<") {
		s = liStartRe.ReplaceAllString(s, "• ")
		s = blockEndRe.ReplaceAllString(s, "\n")
		s = strictText.Sanitize(s)
	}
	s = html.UnescapeString(s)
	lines := strings.Split(s, "\n")
	for i, l := range lines {
		lines[i] = strings.TrimSpace(spacesRe.ReplaceAllString(l, " "))
	}
	s = strings.Join(lines, "\n")
	s = manyNLRe.ReplaceAllString(s, "\n\n")
	return strings.TrimSpace(s)
}

func paragraphsToHTML(s string) string {
	var b strings.Builder
	for _, p := range strings.Split(PlainText(s), "\n\n") {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		b.WriteString("<p>")
		b.WriteString(strings.ReplaceAll(html.EscapeString(p), "\n", "<br>"))
		b.WriteString("</p>")
	}
	return b.String()
}

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		if i := strings.Index(s, "\n"); i >= 0 {
			s = s[i+1:]
		}
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}

func oneLine(s string, max int) string {
	s = strings.Join(strings.Fields(s), " ")
	if r := []rune(s); len(r) > max {
		s = string(r[:max])
	}
	return s
}
