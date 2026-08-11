package sanitize

import (
	"strings"
	"testing"
)

func TestHTML_stripsScript(t *testing.T) {
	in := `<p>Hello</p><script>alert(1)</script>`
	out := HTML(in)
	if out == "" {
		t.Fatal("expected sanitized content")
	}
	if strings.Contains(strings.ToLower(out), "script") {
		t.Fatalf("script not stripped: %q", out)
	}
}

func TestHTML_keepsSafeTags(t *testing.T) {
	in := `<p><strong>Title</strong></p><ul><li>one</li></ul>`
	out := HTML(in)
	if !strings.Contains(out, "<strong>") || !strings.Contains(out, "<li>") {
		t.Fatalf("safe tags removed: %q", out)
	}
}

func TestHTML_allowsTrustedIframe(t *testing.T) {
	in := `<iframe src="https://www.youtube.com/embed/abc" width="560" height="315"></iframe>`
	out := HTML(in)
	if !strings.Contains(out, "youtube.com") {
		t.Fatalf("trusted iframe removed: %q", out)
	}
}

func TestHTML_stripsUntrustedIframe(t *testing.T) {
	in := `<p>x</p><iframe src="https://evil.example/embed"></iframe>`
	out := HTML(in)
	if strings.Contains(strings.ToLower(out), "iframe") || strings.Contains(out, "evil.example") {
		t.Fatalf("untrusted iframe kept: %q", out)
	}
}

func TestHTML_stripsFormLabelArtifacts(t *testing.T) {
	in := `<p><span class="block text-sm font-medium text-stone-700">Повний опис</span></p>`
	out := HTML(in)
	if strings.Contains(out, "text-stone-700") || strings.Contains(out, "form-field-label") {
		t.Fatalf("label artifact kept: %q", out)
	}
	if !strings.Contains(out, "Повний опис") {
		t.Fatalf("text lost: %q", out)
	}
}
