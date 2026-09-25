package handlers

import (
	"strings"
	"unicode/utf8"
)

const ukVowels = "аеєиіїоуюя"

// ukInLocative — «у Празі» / «в Італії» для будь-якої назви.
func ukInLocative(name string) string {
	loc := ukLocative(name)
	if loc == "" {
		return ""
	}
	prep := "у"
	if startsWithVowel(loc) {
		prep = "в"
	}
	return prep + " " + loc
}

func ukLocative(name string) string {
	trimmed := strings.Join(strings.Fields(strings.TrimSpace(name)), " ")
	if trimmed == "" {
		return ""
	}
	if isAbbreviation(trimmed) {
		return trimmed
	}
	if strings.Contains(trimmed, " і ") {
		parts := strings.Split(trimmed, " і ")
		for i := range parts {
			parts[i] = ukLocative(parts[i])
		}
		return strings.Join(parts, " і ")
	}
	words := strings.Fields(trimmed)
	if len(words) >= 2 {
		last := len(words) - 1
		noun := locativeToken(words[last])
		words[last] = noun
		words[last-1] = locativeAdjective(words[last-1], noun)
		return strings.Join(words, " ")
	}
	return locativeToken(trimmed)
}

func isAbbreviation(name string) bool {
	return utf8.RuneCountInString(name) <= 5 && name == strings.ToUpper(name)
}

func startsWithVowel(name string) bool {
	r, _ := utf8.DecodeRuneInString(name)
	return strings.ContainsRune(ukVowels, r) || strings.ContainsRune(strings.ToUpper(ukVowels), r)
}

func locativeToken(token string) string {
	hyphen := ""
	switch {
	case strings.Contains(token, "-"):
		hyphen = "-"
	case strings.Contains(token, "–"):
		hyphen = "–"
	}
	if hyphen == "" {
		return locativeWord(token)
	}
	cut := strings.LastIndex(token, hyphen)
	return token[:cut+len(hyphen)] + locativeWord(token[cut+len(hyphen):])
}

func locativeAdjective(word, noun string) string {
	lower := strings.ToLower(word)
	if strings.HasSuffix(strings.ToLower(noun), "ах") {
		if strings.HasSuffix(lower, "і") {
			return trimSuffixRunes(word, 1) + "их"
		}
		return word
	}
	if strings.HasSuffix(lower, "а") || strings.HasSuffix(lower, "я") {
		return trimSuffixRunes(word, 1) + "ій"
	}
	return word
}

func locativeWord(word string) string {
	lower := strings.ToLower(word)
	if lower == "" {
		return word
	}
	switch {
	case strings.HasSuffix(lower, "йорк"):
		return trimSuffixRunes(word, 3) + "орку"
	case hasSuffix(lower, "о", "е", "є", "у", "ю"):
		return word
	case strings.HasSuffix(lower, "і"):
		return word
	case strings.HasSuffix(lower, "и"):
		return trimSuffixRunes(word, 1) + "ах"
	case strings.HasSuffix(lower, "ень"):
		return trimSuffixRunes(word, 3) + "ні"
	case strings.HasSuffix(lower, "їв"):
		return trimSuffixRunes(word, 2) + "єві"
	case strings.HasSuffix(lower, "ів"):
		return trimSuffixRunes(word, 2) + "ові"
	case hasSuffix(lower, "ськ", "цьк", "зьк"):
		return word + "у"
	case strings.HasSuffix(lower, "ія"):
		return trimSuffixRunes(word, 1) + "ї"
	case strings.HasSuffix(lower, "ща"):
		return trimSuffixRunes(word, 1) + "і"
	case strings.HasSuffix(lower, "га"):
		return trimSuffixRunes(word, 2) + "зі"
	case strings.HasSuffix(lower, "ка"):
		return trimSuffixRunes(word, 2) + "ці"
	case strings.HasSuffix(lower, "ха"):
		return trimSuffixRunes(word, 2) + "сі"
	case strings.HasSuffix(lower, "а"), strings.HasSuffix(lower, "я"):
		return trimSuffixRunes(word, 1) + "і"
	case strings.HasSuffix(lower, "ь"):
		return trimSuffixRunes(word, 1) + "і"
	case strings.HasSuffix(lower, "г"):
		return trimSuffixRunes(word, 1) + "зі"
	case strings.HasSuffix(lower, "к"):
		return trimSuffixRunes(word, 1) + "ці"
	case strings.HasSuffix(lower, "х"):
		return trimSuffixRunes(word, 1) + "сі"
	default:
		return word + "і"
	}
}

func hasSuffix(s string, suffixes ...string) bool {
	for _, suffix := range suffixes {
		if strings.HasSuffix(s, suffix) {
			return true
		}
	}
	return false
}

func trimSuffixRunes(word string, n int) string {
	r := []rune(word)
	if n > len(r) {
		return ""
	}
	return string(r[:len(r)-n])
}
