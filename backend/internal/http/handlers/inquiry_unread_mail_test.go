package handlers

import (
	"testing"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

func TestUnreadMailRecipients(t *testing.T) {
	m := domain.UnreadInquiryMail{
		AuthorRole:    domain.InquiryAuthorTourist,
		AuthorName:    "Іван",
		TouristUserID: 1,
		GuideUserID:   2,
		GuideUnread:   true,
	}
	got := unreadMailRecipients(m)
	if len(got) != 1 || got[0].userID != 2 || !got[0].forGuide {
		t.Fatalf("tourist -> guide: %+v", got)
	}

	m = domain.UnreadInquiryMail{
		AuthorRole:    domain.InquiryAuthorGuide,
		AuthorName:    "Гід",
		TouristUserID: 1,
		GuideUserID:   2,
		TouristUnread: true,
	}
	got = unreadMailRecipients(m)
	if len(got) != 1 || got[0].userID != 1 || got[0].forGuide {
		t.Fatalf("guide -> tourist: %+v", got)
	}

	m = domain.UnreadInquiryMail{
		AuthorRole:    domain.InquiryAuthorAdmin,
		AuthorName:    "Підтримка Gaido",
		TouristUserID: 1,
		GuideUserID:   2,
		TouristUnread: true,
		GuideUnread:   true,
	}
	got = unreadMailRecipients(m)
	if len(got) != 2 {
		t.Fatalf("admin both: %+v", got)
	}
}

func TestShouldMarkUnreadMailSent(t *testing.T) {
	cases := []struct {
		recipients, failures int
		want                 bool
	}{
		{0, 0, true},
		{1, 0, true},
		{2, 0, true},
		{2, 1, true},  // partial failure: do not spam the recipient who got it
		{2, 2, false}, // nothing delivered: retry next tick
		{1, 1, false},
	}
	for _, c := range cases {
		if got := shouldMarkUnreadMailSent(c.recipients, c.failures); got != c.want {
			t.Errorf("recipients=%d failures=%d: got %v want %v", c.recipients, c.failures, got, c.want)
		}
	}
}
