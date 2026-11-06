package handlers

import (
	"context"
	"strings"

	"github.com/vitomonte/experts-tourister/internal/domain"
	mailsvc "github.com/vitomonte/experts-tourister/internal/service/mail"
)

type unreadMailRecipient struct {
	userID     int64
	forGuide   bool
	senderName string
}

func unreadMailRecipients(m domain.UnreadInquiryMail) []unreadMailRecipient {
	sender := strings.TrimSpace(m.AuthorName)
	if sender == "" {
		sender = "Gaido"
	}
	var out []unreadMailRecipient
	switch m.AuthorRole {
	case domain.InquiryAuthorTourist:
		if m.GuideUnread && m.GuideUserID > 0 {
			out = append(out, unreadMailRecipient{userID: m.GuideUserID, forGuide: true, senderName: sender})
		}
	case domain.InquiryAuthorGuide:
		if m.TouristUnread && m.TouristUserID > 0 {
			out = append(out, unreadMailRecipient{userID: m.TouristUserID, forGuide: false, senderName: sender})
		}
	case domain.InquiryAuthorAdmin:
		if m.TouristUnread && m.TouristUserID > 0 {
			out = append(out, unreadMailRecipient{userID: m.TouristUserID, forGuide: false, senderName: sender})
		}
		if m.GuideUnread && m.GuideUserID > 0 {
			out = append(out, unreadMailRecipient{userID: m.GuideUserID, forGuide: true, senderName: sender})
		}
	}
	return out
}

func (h *Handlers) NotifyUnreadInquiryMails(ctx context.Context) (int, error) {
	due, err := h.Inquiries.ListDueUnreadEmails(ctx, 50)
	if err != nil {
		return 0, err
	}
	if len(due) == 0 {
		return 0, nil
	}
	cfg, err := h.Mail.Load(ctx)
	if err != nil {
		return 0, err
	}
	ids := make([]int64, 0, len(due))
	if !mailsvc.Configured(cfg) {
		for _, m := range due {
			ids = append(ids, m.MessageID)
		}
		return 0, h.Inquiries.MarkUnreadEmailSent(ctx, ids)
	}

	sent := 0
	for _, m := range due {
		recips := unreadMailRecipients(m)
		ok := true
		for _, rec := range recips {
			didSend, err := h.sendUnreadInquiryMail(ctx, m, rec)
			if err != nil {
				h.Log.Warn("inquiry unread mail failed", "error", err, "message_id", m.MessageID, "user_id", rec.userID)
				ok = false
				continue
			}
			if didSend {
				sent++
			}
		}
		if ok {
			ids = append(ids, m.MessageID)
		}
	}
	return sent, h.Inquiries.MarkUnreadEmailSent(ctx, ids)
}

func (h *Handlers) sendUnreadInquiryMail(ctx context.Context, m domain.UnreadInquiryMail, rec unreadMailRecipient) (bool, error) {
	u, err := h.Users.GetByID(ctx, rec.userID)
	if err != nil {
		return false, err
	}
	if u == nil || strings.TrimSpace(u.Email) == "" {
		return false, nil
	}
	preview := mailsvc.MessagePreview(m.Kind, m.Body)
	url := mailsvc.InquiryThreadURL(h.Cfg.PublicBaseURL, m.InquiryID, rec.forGuide)
	letter := mailsvc.UnreadInquiryLetter(u.FirstName, rec.senderName, preview, url)
	if err := h.Mail.SendHTML(ctx, u.Email, letter.Subject, letter.Text, letter.HTML); err != nil {
		return false, err
	}
	return true, nil
}
