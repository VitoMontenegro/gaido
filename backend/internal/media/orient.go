package media

import (
	"bytes"
	"image"
	_ "image/png"
	"strings"

	"github.com/disintegration/imageorient"
	_ "golang.org/x/image/webp"
)

func decodeUploadImage(data []byte, mime string) (image.Image, error) {
	mime = strings.ToLower(strings.TrimSpace(mime))
	if mime == "image/jpg" {
		mime = "image/jpeg"
	}
	if mime == "image/jpeg" {
		img, _, err := imageorient.Decode(bytes.NewReader(data))
		return img, err
	}
	img, _, err := image.Decode(bytes.NewReader(data))
	return img, err
}
