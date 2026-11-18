package aiwriter

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeLLM struct {
	out          string
	system, user string
}

func (f *fakeLLM) Complete(_ context.Context, system, user string) (string, error) {
	f.system, f.user = system, user
	return f.out, nil
}

const draft = "Гід у Барселоні 5 років. Гауді, Готичний квартал, тапас. Пишіть в інсту @olena_bcn"

func TestImproveAboutReturnsPlainText(t *testing.T) {
	llm := &fakeLLM{out: "```\nПривіт! Я Олена.\n\n\n**Показую** Барселону.\n```"}
	got, err := NewWithCompleter(llm).Improve(context.Background(), Input{Kind: KindAbout, Text: draft, Name: "Олена", City: "Барселона"})
	if err != nil {
		t.Fatal(err)
	}
	if got != "Привіт! Я Олена.\n\nПоказую Барселону." {
		t.Fatalf("got %q", got)
	}
	if !strings.Contains(llm.user, "Місто: Барселона") || !strings.Contains(llm.user, draft) {
		t.Fatalf("user prompt missing context: %s", llm.user)
	}
	if !strings.Contains(llm.system, "Нічого не вигадуй") {
		t.Fatal("system prompt must forbid invented facts")
	}
}

func TestImproveAboutRejectsTooLongResult(t *testing.T) {
	llm := &fakeLLM{out: strings.Repeat("а", AboutMaxRunes+1)}
	_, err := NewWithCompleter(llm).Improve(context.Background(), Input{Kind: KindAbout, Text: draft})
	if !errors.Is(err, ErrResultTooLong) {
		t.Fatalf("err = %v", err)
	}
}

func TestImproveExcursionSanitizesHTML(t *testing.T) {
	llm := &fakeLLM{out: `<h2>X</h2><p onclick="x()">Екскурсія <a href="http://x">тут</a></p><script>alert(1)</script><ul><li>Саграда</li></ul>`}
	got, err := NewWithCompleter(llm).Improve(context.Background(), Input{Kind: KindExcursion, Text: "<p>" + draft + "</p>", Title: "Барселона Гауді"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(got, "script") || strings.Contains(got, "onclick") || strings.Contains(got, "<a") || strings.Contains(got, "<h2") {
		t.Fatalf("unsafe html kept: %s", got)
	}
	if !strings.Contains(got, "<li>Саграда</li>") {
		t.Fatalf("list dropped: %s", got)
	}
	if strings.Contains(llm.user, "<p>") {
		t.Fatal("editor html must be flattened before sending")
	}
}

func TestImproveExcursionWrapsPlainParagraphs(t *testing.T) {
	llm := &fakeLLM{out: "Перший абзац.\n\nДругий & третій."}
	got, err := NewWithCompleter(llm).Improve(context.Background(), Input{Kind: KindExcursion, Text: draft})
	if err != nil {
		t.Fatal(err)
	}
	if got != "<p>Перший абзац.</p><p>Другий &amp; третій.</p>" {
		t.Fatalf("got %q", got)
	}
}

func TestImproveValidation(t *testing.T) {
	s := NewWithCompleter(&fakeLLM{out: "ok"})
	if _, err := s.Improve(context.Background(), Input{Kind: KindAbout, Text: "<p>коротко</p>"}); !errors.Is(err, ErrTooShort) {
		t.Fatalf("short: %v", err)
	}
	if _, err := s.Improve(context.Background(), Input{Kind: "x", Text: draft}); !errors.Is(err, ErrBadKind) {
		t.Fatalf("kind: %v", err)
	}
	if _, err := New(Options{}).Improve(context.Background(), Input{Kind: KindAbout, Text: draft}); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("not configured: %v", err)
	}
}

func TestPlainTextFlattensEditorHTML(t *testing.T) {
	got := PlainText("<p>Раз &amp; два</p><ul><li>А</li><li>Б</li></ul>")
	if got != "Раз & два\n• А\n• Б" {
		t.Fatalf("got %q", got)
	}
}

func TestOpenAICompatibleClientUsesBaseURLAndHeaders(t *testing.T) {
	var gotPath, gotAuth, gotReferer, gotTitle, gotBody string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotAuth = r.URL.Path, r.Header.Get("Authorization")
		gotReferer, gotTitle = r.Header.Get("HTTP-Referer"), r.Header.Get("X-Title")
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"Готовий текст про Барселону."}}]}`))
	}))
	defer srv.Close()

	s := New(Options{APIKey: "k", BaseURL: srv.URL + "/api/v1/", Model: "openai/gpt-4o-mini", SiteURL: "https://gaido-ua.com", AppName: "Gaido"})
	got, err := s.Improve(context.Background(), Input{Kind: KindAbout, Text: draft})
	if err != nil {
		t.Fatal(err)
	}
	if got != "Готовий текст про Барселону." {
		t.Fatalf("got %q", got)
	}
	if gotPath != "/api/v1/chat/completions" || gotAuth != "Bearer k" || gotReferer != "https://gaido-ua.com" || gotTitle != "Gaido" {
		t.Fatalf("request: path=%q auth=%q referer=%q title=%q", gotPath, gotAuth, gotReferer, gotTitle)
	}
	if !strings.Contains(gotBody, `"model":"openai/gpt-4o-mini"`) {
		t.Fatalf("body: %s", gotBody)
	}
}

func TestOpenAICompatibleClientReportsProviderError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusPaymentRequired)
		_, _ = w.Write([]byte(`{"error":{"message":"Insufficient credits","code":402}}`))
	}))
	defer srv.Close()
	_, err := New(Options{APIKey: "k", BaseURL: srv.URL}).Improve(context.Background(), Input{Kind: KindAbout, Text: draft})
	if err == nil || !strings.Contains(err.Error(), "402") || !strings.Contains(err.Error(), "Insufficient credits") {
		t.Fatalf("err = %v", err)
	}
}
