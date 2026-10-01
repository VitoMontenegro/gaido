package news

import (
	"testing"
	"time"

	"github.com/mmcdole/gofeed"
)

func TestParseDraftSkip(t *testing.T) {
	d, err := parseDraft(`{"skip":true,"reason":"політика","title":"","excerpt":"","slug":"","body_html":""}`)
	if err != nil {
		t.Fatal(err)
	}
	if !d.Skip || d.Reason != "політика" {
		t.Fatalf("%+v", d)
	}
}

func TestParseDraftPublished(t *testing.T) {
	d, err := parseDraft("```json\n{\"skip\":false,\"title\":\"Гід у Празі\",\"excerpt\":\"Коротко\",\"slug\":\"gid-u-prazi\",\"body_html\":\"<p>Текст</p>\"}\n```")
	if err != nil {
		t.Fatal(err)
	}
	if d.Skip || d.Title != "Гід у Празі" || d.BodyHTML == "" {
		t.Fatalf("%+v", d)
	}
}

func TestParseDraftMissingBody(t *testing.T) {
	if _, err := parseDraft(`{"skip":false,"title":"A","body_html":""}`); err == nil {
		t.Fatal("expected error")
	}
}

func TestClip(t *testing.T) {
	if got := clip("  привіт світе  ", 6); got != "привіт" {
		t.Fatalf("got %q", got)
	}
}

func TestSourceFromRSSGUID(t *testing.T) {
	src := sourceFromRSS(&gofeed.Item{Title: "T", Link: "https://ex.ua/a"})
	if src.GUID != "https://ex.ua/a" || src.URL != "https://ex.ua/a" {
		t.Fatalf("%+v", src)
	}
	src = sourceFromRSS(&gofeed.Item{GUID: "abc", Link: "https://ex.ua/a", Title: "T"})
	if src.GUID != "abc" {
		t.Fatalf("guid=%q", src.GUID)
	}
}

func TestStartOfNewsDay(t *testing.T) {
	loc, err := time.LoadLocation("Europe/Kyiv")
	if err != nil {
		t.Skip(err)
	}
	morning := time.Date(2026, 9, 30, 1, 0, 0, 0, loc)
	evening := time.Date(2026, 9, 30, 23, 0, 0, 0, loc)
	if startOfNewsDay(morning) != startOfNewsDay(evening) {
		t.Fatal("same Kyiv day must share one start")
	}
}
