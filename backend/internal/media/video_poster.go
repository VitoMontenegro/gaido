package media

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const VideoPosterAt = 8 * time.Second

func videoPosterSeek(duration time.Duration) time.Duration {
	if duration <= 0 {
		return VideoPosterAt
	}
	if duration > VideoPosterAt+time.Second {
		return VideoPosterAt
	}
	seek := duration / 2
	if seek < 100*time.Millisecond {
		return 100 * time.Millisecond
	}
	return seek
}

func parseDurationSeconds(raw string) time.Duration {
	seconds, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || seconds <= 0 {
		return 0
	}
	return time.Duration(seconds * float64(time.Second))
}

func (s *Storage) ExtractVideoPoster(ctx context.Context, videoKey string) (string, error) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		return "", err
	}
	src := s.PublicPath(videoKey)
	if src == "" {
		return "", fmt.Errorf("invalid video key")
	}
	seek := VideoPosterAt
	if ffprobe, lookErr := exec.LookPath("ffprobe"); lookErr == nil {
		probeCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
		defer cancel()
		out, probeErr := exec.CommandContext(probeCtx, ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", src).Output()
		if probeErr == nil {
			seek = videoPosterSeek(parseDurationSeconds(string(out)))
		}
	}
	tmp, err := os.CreateTemp(filepath.Join(s.BasePath, "public"), ".poster-*.jpg")
	if err != nil {
		return "", err
	}
	tmpName := tmp.Name()
	_ = tmp.Close()
	committed := false
	defer func() {
		if !committed {
			_ = os.Remove(tmpName)
		}
	}()
	extractCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(extractCtx, ffmpeg,
		"-hide_banner", "-loglevel", "error",
		"-ss", fmt.Sprintf("%.2f", seek.Seconds()),
		"-i", src,
		"-frames:v", "1",
		"-an",
		"-vf", "scale='min(1280,iw)':-2",
		"-q:v", "4",
		"-y", tmpName,
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("ffmpeg: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	info, err := os.Stat(tmpName)
	if err != nil || info.Size() < 32 {
		return "", fmt.Errorf("empty poster")
	}
	key := s.randomKey(".jpg")
	if err := os.Rename(tmpName, filepath.Join(s.BasePath, "public", key)); err != nil {
		return "", err
	}
	committed = true
	return key, nil
}
