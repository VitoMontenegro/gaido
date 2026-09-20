package domain

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

var guideAboutLinkRe = regexp.MustCompile(`(?i)` +
	`\[(?:[^\]]*)\]\(\s*(?:https?://|www\.)[^)]+\)|` +
	`(?:https?://|www\.)[^\s<>"']+|` +
	`\b(?:t\.me|telegram\.me|wa\.me|instagram\.com|facebook\.com|fb\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|vk\.com|maps\.app\.goo\.gl)(?:/[^\s<>"']*)?|` +
	`\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b|` +
	`@[A-Za-z][A-Za-z0-9_]{3,31}\b`)

var guideAboutSpaceRe = regexp.MustCompile(`[^\S\n]{2,}`)
var guideAboutNLRe = regexp.MustCompile(`\n{3,}`)

// AcceptGuideAbout keeps existing over-limit values, but rejects growth past GuideAboutMaxLen.
func AcceptGuideAbout(next, current string) (string, error) {
	n := utf8.RuneCountInString(next)
	if n <= GuideAboutMaxLen {
		return next, nil
	}
	if utf8.RuneCountInString(current) >= n {
		return next, nil
	}
	return "", ErrGuideAboutTooLong
}

// PublicGuideAbout is the visitor-facing about text: links and contact handles are hidden.
func PublicGuideAbout(s string) string {
	s = guideAboutLinkRe.ReplaceAllString(s, " ")
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(guideAboutSpaceRe.ReplaceAllString(line, " "))
	}
	s = strings.Join(lines, "\n")
	s = guideAboutNLRe.ReplaceAllString(s, "\n\n")
	return strings.TrimSpace(s)
}
