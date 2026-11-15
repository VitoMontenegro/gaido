package media

import (
	"bytes"
	"encoding/binary"
	"os"
	"strings"
	"testing"
)

func mp4Fixture() []byte {
	data := make([]byte, 64)
	binary.BigEndian.PutUint32(data[:4], 24)
	copy(data[4:8], "ftyp")
	copy(data[8:12], "isom")
	copy(data[16:20], "mp42")
	return data
}

func TestSaveVideoUpload(t *testing.T) {
	storage, err := NewStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	data := mp4Fixture()
	key, err := storage.SaveVideoUpload(bytes.NewReader(data), 1024)
	if err != nil || !strings.HasSuffix(key, ".mp4") {
		t.Fatalf("key=%s err=%v", key, err)
	}
	saved, err := os.ReadFile(storage.PublicPath(key))
	if err != nil || !bytes.Equal(data, saved) {
		t.Fatal("video bytes changed")
	}
	files, _ := os.ReadDir(storage.BasePath + "/private")
	if len(files) != 0 {
		t.Fatal("unexpected private video copy")
	}
}

func TestVideoRejectsOtherFormatsAndCleansIncompleteUpload(t *testing.T) {
	for _, brand := range []string{"avif", "heic", "qt  ", "    "} {
		data := mp4Fixture()
		copy(data[8:12], brand)
		copy(data[16:20], brand)
		if isMP4(data) {
			t.Fatalf("accepted %q as MP4", brand)
		}
	}
	storage, _ := NewStorage(t.TempDir())
	for _, data := range [][]byte{[]byte("not a video.mp4"), mp4Fixture()[:12], mp4Fixture()} {
		if _, err := storage.SaveVideoUpload(bytes.NewReader(data), 40); err == nil {
			t.Fatal("invalid/oversize upload accepted")
		}
	}
	files, _ := os.ReadDir(storage.BasePath + "/public")
	if len(files) != 0 {
		t.Fatal("incomplete upload left on disk")
	}
}
