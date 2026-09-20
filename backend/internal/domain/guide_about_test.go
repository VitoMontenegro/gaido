package domain

import "testing"

func TestAcceptGuideAbout(t *testing.T) {
	long := makeRunes(GuideAboutMaxLen + 50)
	maxed := makeRunes(GuideAboutMaxLen)

	got, err := AcceptGuideAbout("короткий текст", "")
	if err != nil || got != "короткий текст" {
		t.Fatalf("short about: got %q err %v", got, err)
	}

	got, err = AcceptGuideAbout(maxed, "")
	if err != nil || got != maxed {
		t.Fatalf("exact limit: err %v", err)
	}

	if _, err = AcceptGuideAbout(long, ""); err != ErrGuideAboutTooLong {
		t.Fatalf("new over-limit: err %v", err)
	}

	got, err = AcceptGuideAbout(long, long)
	if err != nil || got != long {
		t.Fatalf("keep existing over-limit: got err %v", err)
	}

	shorter := makeRunes(GuideAboutMaxLen + 10)
	got, err = AcceptGuideAbout(shorter, long)
	if err != nil || got != shorter {
		t.Fatalf("shorten existing over-limit: err %v", err)
	}

	if _, err = AcceptGuideAbout(long+"!", long); err != ErrGuideAboutTooLong {
		t.Fatalf("grow existing over-limit: err %v", err)
	}
}

func TestPublicGuideAboutHidesLinks(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"Історик і гід по Празі.", "Історик і гід по Празі."},
		{"Пишіть https://t.me/ivan_guide сюди", "Пишіть сюди"},
		{"Сайт www.example.com/x і все", "Сайт і все"},
		{"Telegram t.me/ivan_guide", "Telegram"},
		{"Instagram instagram.com/ivan.guide", "Instagram"},
		{"Пошта me@mail.com для зв'язку", "Пошта для зв'язку"},
		{"Нік @ivan_guide у телеграмі", "Нік у телеграмі"},
		{"Див. [сайт](https://example.com/a)", "Див."},
		{"Рядок\n\nhttps://wa.me/380501112233\n\nкінець", "Рядок\n\nкінець"},
	}
	for _, tc := range cases {
		got := PublicGuideAbout(tc.in)
		if got != tc.want {
			t.Fatalf("PublicGuideAbout(%q)\n got %q\nwant %q", tc.in, got, tc.want)
		}
	}
}

func makeRunes(n int) string {
	r := make([]rune, n)
	for i := range r {
		r[i] = 'а'
	}
	return string(r)
}
