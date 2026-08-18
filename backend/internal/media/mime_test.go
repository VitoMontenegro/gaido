package media

import (
	"bytes"
	"strings"
	"testing"
)

func TestDetectMIME_validJPEG(t *testing.T) {
	data := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F'}
	mime, err := DetectMIME(data, "image/jpeg")
	if err != nil || mime != "image/jpeg" {
		t.Fatalf("DetectMIME jpeg: %q, %v", mime, err)
	}
}

func TestDetectMIME_usesSniffWhenDeclaredLies(t *testing.T) {
	png := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0}
	mime, err := DetectMIME(png, "image/webp")
	if err != nil || mime != "image/png" {
		t.Fatalf("DetectMIME png as webp: %q, %v", mime, err)
	}

	jpeg := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F'}
	mime, err = DetectMIME(jpeg, "")
	if err != nil || mime != "image/jpeg" {
		t.Fatalf("DetectMIME jpeg empty declared: %q, %v", mime, err)
	}
	mime, err = DetectMIME(jpeg, "application/octet-stream")
	if err != nil || mime != "image/jpeg" {
		t.Fatalf("DetectMIME jpeg octet-stream: %q, %v", mime, err)
	}
}

func TestDetectMIME_validPDF(t *testing.T) {
	data := append([]byte("%PDF-1.4\n"), bytes.Repeat([]byte("x"), 20)...)
	mime, err := DetectMIME(data, "application/pdf")
	if err != nil || mime != "application/pdf" {
		t.Fatalf("DetectMIME pdf: %q, %v", mime, err)
	}
}

func TestDetectMIME_rejectsPlainText(t *testing.T) {
	_, err := DetectMIME([]byte("hello world"), "text/plain")
	if err == nil {
		t.Fatal("expected error for text/plain")
	}
}

func TestSniffMIME_webp(t *testing.T) {
	data := append([]byte("RIFF"), make([]byte, 4)...)
	data = append(data, []byte("WEBP")...)
	if got := sniffMIME(data); got != "image/webp" {
		t.Fatalf("webp sniff: %q", got)
	}
}

func TestSaveUpload_rejectsFakeJPEG(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStorage(dir)
	if err != nil {
		t.Fatal(err)
	}
	_, _, _, err = s.SaveUpload(strings.NewReader("not-an-image"), "image/jpeg", 1024)
	if err == nil {
		t.Fatal("expected error for fake jpeg content")
	}
}
