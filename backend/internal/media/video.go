package media

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

const MaxVideoUploadBytes int64 = 50 * 1024 * 1024

var mp4Brands = map[string]struct{}{
	"isom": {}, "iso2": {}, "iso3": {}, "iso4": {}, "iso5": {}, "iso6": {},
	"iso7": {}, "iso8": {}, "iso9": {}, "mp41": {}, "mp42": {}, "mp71": {},
	"avc1": {}, "M4V ": {}, "dash": {}, "cmfc": {}, "msdh": {}, "nvr1": {},
}

// MP4 shares the ISO container with HEIF/AVIF; accept an MP4 brand anywhere
// in the ftyp box rather than trusting the filename or Content-Type.
func isMP4(header []byte) bool {
	if len(header) < 16 || !bytes.Equal(header[4:8], []byte("ftyp")) {
		return false
	}
	size := binary.BigEndian.Uint32(header[:4])
	if size < 16 {
		return false
	}
	end := int(size)
	if end > len(header) {
		end = len(header)
	}
	for off := 8; off+4 <= end; off += 4 {
		if _, ok := mp4Brands[string(header[off:off+4])]; ok {
			return true
		}
	}
	return false
}

// SaveVideoUpload streams to disk and publishes only a complete, bounded upload.
// No duplicate private copy or image processing is needed for public tour videos.
func (s *Storage) SaveVideoUpload(r io.Reader, maxBytes int64) (key string, err error) {
	header := make([]byte, 256)
	n, readErr := io.ReadFull(r, header)
	if readErr != nil && readErr != io.ErrUnexpectedEOF {
		return "", fmt.Errorf("invalid mp4")
	}
	header = header[:n]
	if !isMP4(header) {
		return "", fmt.Errorf("invalid mp4")
	}
	if err := os.MkdirAll(filepath.Join(s.BasePath, "public"), 0o755); err != nil {
		return "", err
	}
	file, err := os.CreateTemp(filepath.Join(s.BasePath, "public"), ".video-*")
	if err != nil {
		return "", err
	}
	tmpName := file.Name()
	committed := false
	defer func() {
		_ = file.Close()
		if !committed {
			_ = os.Remove(tmpName)
		}
	}()
	size, err := io.Copy(file, io.LimitReader(io.MultiReader(bytes.NewReader(header), r), maxBytes+1))
	if err != nil {
		return "", err
	}
	if size > maxBytes {
		return "", fmt.Errorf("file too large")
	}
	if size < int64(binary.BigEndian.Uint32(header[:4])) {
		return "", fmt.Errorf("invalid mp4")
	}
	if err := file.Chmod(0o644); err != nil {
		return "", err
	}
	if err := file.Close(); err != nil {
		return "", err
	}
	key = s.randomKey(".mp4")
	if err := os.Rename(tmpName, filepath.Join(s.BasePath, "public", key)); err != nil {
		return "", err
	}
	committed = true
	return key, nil
}
