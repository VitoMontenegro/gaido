package media

import (
	"bytes"
	"encoding/binary"
	"errors"
	"hash/crc32"
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

func TestSaveUpload_acceptsJPEGLabeledAsWebP(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStorage(dir)
	if err != nil {
		t.Fatal(err)
	}
	jpeg := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F'}
	jpeg = append(jpeg, make([]byte, 32)...)
	priv, pub, size, err := s.SaveUpload(strings.NewReader(string(jpeg)), "image/webp", 1024)
	if err != nil {
		t.Fatalf("SaveUpload jpeg as webp: %v", err)
	}
	if size != int64(len(jpeg)) || priv == "" || pub == "" {
		t.Fatalf("unexpected save result priv=%q pub=%q size=%d", priv, pub, size)
	}
	if !strings.HasSuffix(priv, ".jpg") || !strings.HasSuffix(pub, ".jpg") {
		t.Fatalf("expected .jpg keys, got %q %q", priv, pub)
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

func TestSaveUpload_rejectsHugeImageDimensions(t *testing.T) {
	dir := t.TempDir()
	s, err := NewStorage(dir)
	if err != nil {
		t.Fatal(err)
	}
	// Minimal PNG header declaring 30000x30000 px: tiny file, huge decode.
	var buf bytes.Buffer
	buf.Write([]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})
	ihdr := []byte{0, 0, 0x75, 0x30, 0, 0, 0x75, 0x30, 8, 6, 0, 0, 0}
	_ = binary.Write(&buf, binary.BigEndian, uint32(len(ihdr)))
	chunk := append([]byte("IHDR"), ihdr...)
	buf.Write(chunk)
	_ = binary.Write(&buf, binary.BigEndian, crc32.ChecksumIEEE(chunk))
	_, _, _, err = s.SaveUpload(bytes.NewReader(buf.Bytes()), "image/png", 1<<20)
	if !errors.Is(err, ErrImageTooLarge) {
		t.Fatalf("expected ErrImageTooLarge, got %v", err)
	}
}

func TestCheckImageDimensions(t *testing.T) {
	if err := checkImageDimensions(4032, 3024); err != nil {
		t.Fatalf("phone photo rejected: %v", err)
	}
	for _, d := range [][2]int{{0, 10}, {13000, 10}, {8000, 8000}} {
		if checkImageDimensions(d[0], d[1]) == nil {
			t.Fatalf("%v should be rejected", d)
		}
	}
}
