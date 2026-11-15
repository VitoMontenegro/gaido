package media

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestVideoPosterSeek(t *testing.T) {
	if got := videoPosterSeek(20 * time.Second); got != VideoPosterAt {
		t.Fatalf("long video seek %v", got)
	}
	if got := videoPosterSeek(6 * time.Second); got != 3*time.Second {
		t.Fatalf("short video seek %v", got)
	}
}

func TestExtractVideoPoster(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not installed")
	}
	dir := t.TempDir()
	storage, err := NewStorage(dir)
	if err != nil {
		t.Fatal(err)
	}
	src := filepath.Join(dir, "clip.mp4")
	cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64:d=10", "-pix_fmt", "yuv420p", "-t", "10", "-y", src)
	if err := cmd.Run(); err != nil {
		t.Skip("ffmpeg cannot encode a test clip")
	}
	data, err := os.ReadFile(src)
	if err != nil {
		t.Fatal(err)
	}
	key, err := storage.SaveVideoUpload(bytes.NewReader(data), int64(len(data)+16))
	if err != nil {
		t.Fatal(err)
	}
	poster, err := storage.ExtractVideoPoster(context.Background(), key)
	if err != nil || poster == "" {
		t.Fatalf("poster=%q err=%v", poster, err)
	}
	info, err := os.Stat(storage.PublicPath(poster))
	if err != nil || info.Size() < 32 {
		t.Fatalf("poster file missing: %v", err)
	}
}
