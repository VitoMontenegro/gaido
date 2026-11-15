package identity

import "testing"

func TestGoogleEmailTrusted(t *testing.T) {
	if GoogleEmailTrusted("a@gmail.com", false, "example.com") {
		t.Fatal("unverified must not be trusted")
	}
	if !GoogleEmailTrusted("a@gmail.com", true, "") {
		t.Fatal("verified gmail must be trusted")
	}
	if !GoogleEmailTrusted("a@corp.com", true, "corp.com") {
		t.Fatal("verified hd must be trusted")
	}
	if GoogleEmailTrusted("a@corp.com", true, "") {
		t.Fatal("other domain without hd must not be trusted")
	}
}

func TestGenerateLogin(t *testing.T) {
	s, err := GenerateLogin()
	if err != nil {
		t.Fatal(err)
	}
	if !ValidGeneratedLogin(s) {
		t.Fatalf("invalid generated login %q", s)
	}
}

func TestProfileSlug(t *testing.T) {
	if got := ProfileSlug("Іван Петренко", "guide"); got != "ivan_petrenko" {
		t.Fatalf("got %q", got)
	}
	if !ValidNewProfileSlug("ivan_petrenko") {
		t.Fatal("new slug should be valid")
	}
	if ValidNewProfileSlug("ivan-petrenko") {
		t.Fatal("hyphen is not a new profile slug")
	}
	if !ValidExistingProfileSlug("ivan-petrenko") {
		t.Fatal("legacy hyphen slug must remain acceptable")
	}
}
