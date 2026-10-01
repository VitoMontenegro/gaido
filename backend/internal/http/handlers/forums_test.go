package handlers

import "testing"

func TestCanReadForum(t *testing.T) {
	if !canReadForum("public", nil) {
		t.Fatal("public forum is readable without roles")
	}
	if canReadForum("guides", nil) {
		t.Fatal("guides forum is closed to guests")
	}
	if canReadForum("guides", []string{"ROLE_TOURIST"}) {
		t.Fatal("guides forum is closed to tourists")
	}
	if !canReadForum("guides", []string{"ROLE_GUIDE"}) {
		t.Fatal("guides can read guides forum")
	}
	if !canReadForum("guides", []string{"ROLE_ADMIN"}) {
		t.Fatal("admins can read guides forum")
	}
}

func TestCanWriteForum(t *testing.T) {
	if canWriteForum("public", 0, nil) {
		t.Fatal("guest cannot write")
	}
	if !canWriteForum("public", 1, []string{"ROLE_TOURIST"}) {
		t.Fatal("logged-in user can write in public forum")
	}
	if canWriteForum("guides", 1, []string{"ROLE_TOURIST"}) {
		t.Fatal("tourist cannot write in guides forum")
	}
	if !canWriteForum("guides", 2, []string{"ROLE_GUIDE"}) {
		t.Fatal("guide can write in guides forum")
	}
}

func TestSanitizeForumInput(t *testing.T) {
	if _, ok := sanitizeForumTitle("ab"); ok {
		t.Fatal("short title rejected")
	}
	title, ok := sanitizeForumTitle("  Нова  тема  ")
	if !ok || title != "Нова тема" {
		t.Fatalf("title = %q ok=%v", title, ok)
	}
	if _, ok := sanitizeForumBody("  "); ok {
		t.Fatal("empty body rejected")
	}
}
