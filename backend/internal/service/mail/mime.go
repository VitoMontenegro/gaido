package mail

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"strings"
)

func buildMIME(from, to, subject, text, html string) []byte {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + encodeSubject(subject) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	if strings.TrimSpace(html) == "" {
		b.WriteString("Content-Type: text/plain; charset=UTF-8\r\n\r\n")
		b.WriteString(text)
		return []byte(b.String())
	}
	boundary := mimeBoundary()
	b.WriteString("Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n\r\n")
	writeMIMEPart(&b, boundary, "text/plain", text)
	writeMIMEPart(&b, boundary, "text/html", html)
	b.WriteString("--" + boundary + "--\r\n")
	return []byte(b.String())
}

func writeMIMEPart(b *strings.Builder, boundary, contentType, body string) {
	b.WriteString("--" + boundary + "\r\n")
	b.WriteString("Content-Type: " + contentType + "; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	b.WriteString(chunk64(base64.StdEncoding.EncodeToString([]byte(body))) + "\r\n")
}

func mimeBoundary() string {
	raw := make([]byte, 12)
	if _, err := rand.Read(raw); err != nil {
		return "gaido-mail"
	}
	return "gaido-" + hex.EncodeToString(raw)
}

func chunk64(enc string) string {
	const n = 76
	var b strings.Builder
	for len(enc) > n {
		b.WriteString(enc[:n])
		b.WriteString("\r\n")
		enc = enc[n:]
	}
	b.WriteString(enc)
	return b.String()
}
