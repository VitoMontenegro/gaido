package mail

import (
	"fmt"
	"html"
	"strings"
)

func InquiryThreadURL(publicBase string, inquiryID int64, forGuide bool) string {
	base := strings.TrimRight(strings.TrimSpace(publicBase), "/")
	if base == "" {
		base = "https://gaido-ua.com"
	}
	if forGuide {
		return fmt.Sprintf("%s/svit/account/guide/inquiries/%d", base, inquiryID)
	}
	return fmt.Sprintf("%s/svit/account/inquiries/%d", base, inquiryID)
}

func MessagePreview(kind, body string) string {
	body = strings.TrimSpace(body)
	if body == "" {
		if kind == "attachment" {
			return "Фото"
		}
		return "Нове повідомлення"
	}
	runes := []rune(body)
	if len(runes) > 400 {
		return string(runes[:400]) + "…"
	}
	return body
}

func UnreadInquiryLetter(recipientName, senderName, preview, threadURL string) Letter {
	name := strings.TrimSpace(recipientName)
	if name == "" {
		name = "друже"
	}
	sender := strings.TrimSpace(senderName)
	if sender == "" {
		sender = "учасник діалогу"
	}
	preview = strings.TrimSpace(preview)
	if preview == "" {
		preview = "Нове повідомлення"
	}
	subject := "Непрочитане повідомлення на Gaido"
	text := "Вітаємо, " + name + "!\n\n" +
		"У вас є непрочитане повідомлення від " + sender + ":\n\n" +
		preview + "\n\n" +
		"Відкрити діалог:\n" + threadURL + "\n\n" +
		"З повагою,\nКоманда Gaido\n"
	htmlBody := "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f3f;\">Вам написав " +
		html.EscapeString(sender) + ", але повідомлення ще не прочитане.</p>" +
		"<p style=\"margin:0 0 8px;font-size:16px;line-height:1.6;color:#3f3f3f;white-space:pre-wrap;\">" +
		html.EscapeString(preview) + "</p>"
	html := brandedHTML(
		"Непрочитане повідомлення",
		"Вітаємо, "+html.EscapeString(name)+"!",
		htmlBody,
		"Відкрити діалог",
		threadURL,
		"Якщо кнопка не відкривається, скопіюйте посилання:<br>"+html.EscapeString(threadURL),
	)
	return Letter{Subject: subject, Text: text, HTML: html}
}
