package media

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestPublicPath_rejectsTraversal(t *testing.T) {
	s := &Storage{BasePath: "/tmp/storage"}
	for _, key := range []string{"../etc/passwd", "..\\win", "foo/bar", ""} {
		if p := s.PublicPath(key); p != "" {
			t.Fatalf("expected empty path for %q, got %q", key, p)
		}
	}
	if p := s.PublicPath("abc123.jpg"); p != filepath.Join("/tmp/storage", "public", "abc123.jpg") {
		t.Fatalf("unexpected safe path: %q", p)
	}
}

func TestSaveUpload_rejectsDisallowedMIME(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStorage(dir)
	if err != nil {
		t.Fatal(err)
	}
	_, _, _, err = s.SaveUpload(strings.NewReader("hello"), "application/octet-stream", 1024)
	if err == nil {
		t.Fatal("expected error for disallowed mime")
	}
}

func TestAllowedMIME(t *testing.T) {
	for mime, wantExt := range map[string]string{
		"image/jpeg":      ".jpg",
		"image/png":       ".png",
		"application/pdf": ".pdf",
	} {
		ext, ok := AllowedMIME(mime)
		if !ok || ext != wantExt {
			t.Fatalf("AllowedMIME(%q) = %q, %v; want %q, true", mime, ext, ok, wantExt)
		}
	}
	if _, ok := AllowedMIME("text/plain"); ok {
		t.Fatal("text/plain should be rejected")
	}
}

func TestSaveUpload_rejectsOversize(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStorage(dir)
	if err != nil {
		t.Fatal(err)
	}
	_, _, _, err = s.SaveUpload(strings.NewReader("hello"), "image/jpeg", 3)
	if err == nil {
		t.Fatal("expected error for oversized read")
	}
}
