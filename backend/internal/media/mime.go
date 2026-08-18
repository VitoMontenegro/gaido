package media

import (
	"bytes"
	"fmt"
)

// DetectMIME returns the MIME from magic bytes.
// Declared Content-Type is ignored when it disagrees: iOS Safari canvas
// often labels JPEG/PNG as image/webp.
func DetectMIME(data []byte, _ string) (string, error) {
	detected := sniffMIME(data)
	if detected == "" {
		return "", fmt.Errorf("unknown file type")
	}
	if _, ok := allowedMIMEs[detected]; !ok {
		return "", fmt.Errorf("unsupported mime type")
	}
	return detected, nil
}

func sniffMIME(data []byte) string {
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}) {
		return "image/png"
	}
	if len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")) {
		return "image/webp"
	}
	if len(data) >= 5 && bytes.Equal(data[:5], []byte("%PDF-")) {
		return "application/pdf"
	}
	return ""
}
