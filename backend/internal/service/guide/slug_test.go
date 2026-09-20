package guide

import "testing"

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
