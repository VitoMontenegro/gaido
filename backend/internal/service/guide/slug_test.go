package guide

import (
	"strings"
	"testing"
)

func TestArticleSlug(t *testing.T) {
	tests := []struct {
		raw, title, want string
	}{
		{"", "Чому Прагу вважають містичним містом?", "chomu-prahu-vvazhaiut-mistychnym-mistom"},
		{"https://svit.gaido-ua.com/account/guide/articles", "Чому Прагу вважають містичним містом?", "chomu-prahu-vvazhaiut-mistychnym-mistom"},
		{"https:/svit.gaido-ua.com/account/guide/articles", "Допомога туристу", "dopomoha-turystu"},
		{"yak-obraty-gida", "Інший заголовок", "yak-obraty-gida"},
		{"dopomoga-turystu", "", "dopomoga-turystu"},
		{"", "Hello World", "hello-world"},
		{"", "!!!", "article"},
	}
	for _, tt := range tests {
		if got := ArticleSlug(tt.raw, tt.title); got != tt.want {
			t.Fatalf("ArticleSlug(%q, %q) = %q, want %q", tt.raw, tt.title, got, tt.want)
		}
	}
}

func TestWebsiteSlug(t *testing.T) {
	if got := WebsiteSlug("", "Віто"); got != "vito" {
		t.Fatalf("from name: %q", got)
	}
	if got := WebsiteSlug("My Shop", "Інше"); got != "my-shop" {
		t.Fatalf("from raw: %q", got)
	}
	if got := WebsiteSlug("", "!!!"); got != "provider" {
		t.Fatalf("fallback: %q", got)
	}
}

func TestReserveOrAllocate(t *testing.T) {
	taken := map[string]bool{"vito": true}
	check := func(s string) (bool, error) { return taken[s], nil }
	if _, err := ReserveOrAllocate("vito", "Vitaliy", "guide", check); err != ErrSlugConflict {
		t.Fatalf("want conflict, got %v", err)
	}
	got, err := ReserveOrAllocate("vitaliy", "Vitaliy", "guide", check)
	if err != nil || got != "vitaliy" {
		t.Fatalf("got %q err %v", got, err)
	}
	got, err = ReserveOrAllocate("", "Віто", "guide", check)
	if err != nil || got == "vito" || !strings.HasSuffix(got, "-vito") {
		t.Fatalf("got %q err %v", got, err)
	}
}

func TestAllocateUnique(t *testing.T) {
	taken := map[string]bool{"vito": true}
	got, err := AllocateUnique("", "Віто", "carrier", func(s string) (bool, error) {
		return taken[s], nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if got == "vito" || !strings.HasSuffix(got, "-vito") {
		t.Fatalf("got %q, want prefixed vito", got)
	}
}

func TestCitySlug(t *testing.T) {
	tests := map[string]string{
		"Краків":   "krakiv",
		"Kraków":   "krakow",
		"Warszawa": "warszawa",
		"Щецин":    "shchetsyn",
		"":         "",
	}
	for in, want := range tests {
		got := CitySlug(in)
		if want == "" {
			if got == "" || got == "guide" {
				t.Fatalf("CitySlug(%q) = %q, want non-empty slug", in, got)
			}
			continue
		}
		if got != want {
			t.Fatalf("CitySlug(%q) = %q, want %q", in, got, want)
		}
	}
}
