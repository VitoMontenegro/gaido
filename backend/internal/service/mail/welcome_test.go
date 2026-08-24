package mail

import (
	"strings"
	"testing"
)

func TestWelcomeGuideLetter(t *testing.T) {
	got := WelcomeLetter("Олена", true)
	if got.Subject != "Вітаємо! Ви зареєстровані на Gaido" {
		t.Fatalf("subject: %q", got.Subject)
	}
	if !strings.Contains(got.Text, GuideInstructionsURL) || !strings.Contains(got.HTML, GuideInstructionsURL) {
		t.Fatal("missing instructions url")
	}
	if !strings.Contains(got.HTML, "Вітаємо, Олена!") {
		t.Fatal("missing greeting")
	}
}

func TestWelcomeEscapesHTML(t *testing.T) {
	got := WelcomeLetter(`<img src=x>`, true)
	if strings.Contains(got.HTML, "<img src=x>") {
		t.Fatal("name must be escaped")
	}
	if !strings.Contains(got.HTML, "&lt;img src=x&gt;") {
		t.Fatal("expected escaped name")
	}
}

func TestBuildMIMEMultipart(t *testing.T) {
	msg := string(buildMIME("Gaido <a@b.c>", "c@d.e", "Тема", "plain", "<p>hi</p>"))
	if !strings.Contains(msg, "multipart/alternative") || !strings.Contains(msg, "text/html") {
		t.Fatalf("mime: %s", msg[:min(200, len(msg))])
	}
}
