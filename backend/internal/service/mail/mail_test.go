package mail

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestNormalizeKeepsPassword(t *testing.T) {
	got := normalize(domain.MailSettings{
		Enabled:    true,
		Host:       " smtp.example.com ",
		Port:       465,
		Username:   "noreply",
		FromEmail:  "noreply@example.com",
		Encryption: "TLS",
	}, "secret")
	if got.Password != "secret" {
		t.Fatalf("password: %q", got.Password)
	}
	if got.Host != "smtp.example.com" || got.Port != 465 || got.Encryption != domain.MailEncryptionTLS {
		t.Fatalf("normalized: %+v", got)
	}
}

func TestNormalizeReplacesPassword(t *testing.T) {
	got := normalize(domain.MailSettings{Password: "new", Host: "h", FromEmail: "a@b.c", Port: 25}, "old")
	if got.Password != "new" {
		t.Fatalf("password: %q", got.Password)
	}
}

func TestConfigured(t *testing.T) {
	if Configured(domain.MailSettings{}) {
		t.Fatal("empty should not be configured")
	}
	if !Configured(domain.MailSettings{Enabled: true, Host: "smtp.local", Port: 587, FromEmail: "a@b.c"}) {
		t.Fatal("expected configured")
	}
}
