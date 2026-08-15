package media

import (
	"image"
	"image/jpeg"
	"io"
)

func jpegEncode(w io.Writer, img image.Image, quality int) error {
	return jpeg.Encode(w, img, &jpeg.Options{Quality: quality})
}
