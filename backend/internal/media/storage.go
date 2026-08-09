package media

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type Storage struct {
	BasePath string
}

func NewStorage(base string) (*Storage, error) {
	dirs := []string{"private", "public"}
	for _, d := range dirs {
		if err := os.MkdirAll(filepath.Join(base, d), 0o755); err != nil {
			return nil, err
		}
	}
	return &Storage{BasePath: base}, nil
}

func (s *Storage) randomKey(ext string) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b) + ext
}

func (s *Storage) SaveUpload(r io.Reader, mime string, maxBytes int64) (privateKey, publicKey string, size int64, err error) {
	ext := ".bin"
	if strings.Contains(mime, "jpeg") || strings.Contains(mime, "jpg") {
		ext = ".jpg"
	} else if strings.Contains(mime, "png") {
		ext = ".png"
	} else if strings.Contains(mime, "webp") {
		ext = ".webp"
	} else if strings.Contains(mime, "pdf") {
		ext = ".pdf"
	}

	limited := io.LimitReader(r, maxBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return "", "", 0, err
	}
	if int64(len(data)) > maxBytes {
		return "", "", 0, fmt.Errorf("file too large")
	}

	privateKey = s.randomKey(ext)
	publicKey = s.randomKey(ext)
	if err := os.WriteFile(filepath.Join(s.BasePath, "private", privateKey), data, 0o600); err != nil {
		return "", "", 0, err
	}

	wm, err := applyWatermark(data, mime)
	if err != nil {
		wm = data
	}
	if err := os.WriteFile(filepath.Join(s.BasePath, "public", publicKey), wm, 0o644); err != nil {
		return "", "", 0, err
	}
	return privateKey, publicKey, int64(len(data)), nil
}

func (s *Storage) PublicPath(key string) string {
	return filepath.Join(s.BasePath, "public", key)
}

func applyWatermark(data []byte, mime string) ([]byte, error) {
	if !strings.HasPrefix(mime, "image/") {
		return watermarkPDFPlaceholder(data), nil
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return data, err
	}
	bounds := img.Bounds()
	rgba := image.NewRGBA(bounds)
	draw.Draw(rgba, bounds, img, bounds.Min, draw.Src)

	// Subtle corner mark only — grid of white bars looked like broken progressive load.
	w, h := bounds.Dx(), bounds.Dy()
	markW, markH := min(160, w/4), min(36, h/12)
	x0 := bounds.Max.X - markW - max(12, w/80)
	y0 := bounds.Max.Y - markH - max(12, h/80)
	c := color.RGBA{R: 255, G: 255, B: 255, A: 55}
	for y := y0; y < y0+markH; y++ {
		for x := x0; x < x0+markW; x++ {
			if x >= bounds.Min.X && x < bounds.Max.X && y >= bounds.Min.Y && y < bounds.Max.Y {
				rgba.Set(x, y, blend(rgba.RGBAAt(x, y), c))
			}
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, rgba, &jpeg.Options{Quality: 88}); err != nil {
		return data, err
	}
	return buf.Bytes(), nil
}

func blend(base, overlay color.RGBA) color.RGBA {
	a := float64(overlay.A) / 255
	return color.RGBA{
		R: uint8(float64(base.R)*(1-a) + float64(overlay.R)*a),
		G: uint8(float64(base.G)*(1-a) + float64(overlay.G)*a),
		B: uint8(float64(base.B)*(1-a) + float64(overlay.B)*a),
		A: 255,
	}
}

func watermarkPDFPlaceholder(data []byte) []byte {
	return data
}
