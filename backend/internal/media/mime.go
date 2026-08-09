package media

import (
	"bytes"
	"fmt"
	"strings"
)

// DetectMIME validates file content against declared MIME using magic bytes.
func DetectMIME(data []byte, declared string) (string, error) {
	declared = strings.ToLower(strings.TrimSpace(declared))
	if declared == "" {
		return "", fmt.Errorf("missing content type")
	}
	if _, ok := allowedMIMEs[declared]; !ok {
		return "", fmt.Errorf("unsupported mime type")
	}

	detected := sniffMIME(data)
	if detected == "" {
		return "", fmt.Errorf("unknown file type")
	}
	if detected != declared {
		// Allow image/jpg alias
		if !(declared == "image/jpg" && detected == "image/jpeg") {
			return "", fmt.Errorf("content type mismatch")
		}
		detected = declared
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
