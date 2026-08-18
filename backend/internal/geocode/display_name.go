package geocode

import (
	"strings"
	"unicode"
)

// NormalizeDisplayName — українська назва з великої літери (і після дефіса/пробілу).
func NormalizeDisplayName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	words := strings.Fields(name)
	for i, word := range words {
		words[i] = normalizeToken(word)
	}
	return strings.Join(words, " ")
}

func normalizeToken(token string) string {
	parts := strings.Split(token, "-")
	for i, part := range parts {
		parts[i] = capitalizeWord(strings.TrimSpace(part))
	}
	return strings.Join(parts, "-")
}

func capitalizeWord(s string) string {
	if s == "" {
		return ""
	}
	runes := []rune(strings.ToLower(s))
	runes[0] = unicode.ToUpper(runes[0])
	return string(runes)
}

// NeedsUkrainianName — латиниця без кирилиці або російська орфографія.
func NeedsUkrainianName(name string) bool {
	hasLatin, hasCyrillic := false, false
	for _, r := range name {
		if unicode.Is(unicode.Cyrillic, r) {
			hasCyrillic = true
		}
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			hasLatin = true
		}
	}
	if hasLatin && !hasCyrillic {
		return true
	}
	return LooksRussian(name)
}

// LooksRussian — російські літери / типові закінчення, яких немає в українській.
func LooksRussian(name string) bool {
	for _, r := range name {
		switch r {
		case 'ы', 'э', 'ё', 'ъ', 'Ы', 'Э', 'Ё', 'Ъ':
			return true
		}
	}
	lower := strings.ToLower(name)
	for _, s := range []string{"эй", "ия", "ские ", "ская ", "ский "} {
		if strings.Contains(lower, s) {
			return true
		}
	}
	return false
}

// HasCyrillic — чи є в назві кирилиця (ознака української/слов'янської назви з OSM).
func HasCyrillic(name string) bool {
	for _, r := range name {
		if unicode.Is(unicode.Cyrillic, r) {
			return true
		}
	}
	return false
}
