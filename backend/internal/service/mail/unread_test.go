package mail

import "testing"

func TestInquiryThreadURL(t *testing.T) {
	got := InquiryThreadURL("https://gaido-ua.com/", 42, false)
	want := "https://gaido-ua.com/svit/account/inquiries/42"
	if got != want {
		t.Fatalf("tourist url: %s", got)
	}
	got = InquiryThreadURL("https://gaido-ua.com", 42, true)
	want = "https://gaido-ua.com/svit/account/guide/inquiries/42"
	if got != want {
		t.Fatalf("guide url: %s", got)
	}
	got = InquiryThreadURL("", 7, false)
	if got != "https://gaido-ua.com/svit/account/inquiries/7" {
		t.Fatalf("empty base: %s", got)
	}
}

func TestMessagePreview(t *testing.T) {
	if got := MessagePreview("attachment", ""); got != "Фото" {
		t.Fatalf("attachment: %s", got)
	}
	if got := MessagePreview("text", "  привіт  "); got != "привіт" {
		t.Fatalf("text: %s", got)
	}
	long := make([]rune, 410)
	for i := range long {
		long[i] = 'a'
	}
	got := MessagePreview("text", string(long))
	rs := []rune(got)
	if len(rs) != 401 || rs[len(rs)-1] != '…' {
		t.Fatalf("truncated: %q len=%d", got, len(rs))
	}
}

func TestUnreadInquiryLetter(t *testing.T) {
	letter := UnreadInquiryLetter("Оля", "Іван", "Чи вільні ви 12-го?", "https://gaido-ua.com/svit/account/inquiries/9")
	if letter.Subject != "Непрочитане повідомлення на Gaido" {
		t.Fatalf("subject: %s", letter.Subject)
	}
	if !containsAll(letter.Text, "Оля", "Іван", "Чи вільні ви 12-го?", "https://gaido-ua.com/svit/account/inquiries/9") {
		t.Fatalf("text: %s", letter.Text)
	}
	if !containsAll(letter.HTML, "Оля", "Іван", "Чи вільні ви 12-го?", "https://gaido-ua.com/svit/account/inquiries/9", "Відкрити діалог") {
		t.Fatalf("html: %s", letter.HTML)
	}
}

func containsAll(s string, parts ...string) bool {
	for _, p := range parts {
		if p == "" || len(s) == 0 {
			return false
		}
		if !contains(s, p) {
			return false
		}
	}
	return true
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 || indexOf(s, sub) >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
