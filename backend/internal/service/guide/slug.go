package guide

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// CitySlug — slug для міста (латиниця, транслітерація кирилиці).
func CitySlug(name string) string {
	s := asciiSlug(normalizeCityName(name))
	if s != "" {
		return s
	}
	h := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(name))))
	return "city-" + hex.EncodeToString(h[:6])
}

func normalizeCityName(name string) string {
	name = strings.TrimSpace(name)
	name = stripDiacritics(name)
	var b strings.Builder
	for _, r := range name {
		switch r {
		case 'ł', 'Ł':
			b.WriteRune('l')
		case 'đ', 'Đ':
			b.WriteRune('d')
		case 'ß':
			b.WriteString("ss")
		default:
			b.WriteRune(r)
		}
	}
	return transliterateCyrillic(b.String())
}

func stripDiacritics(s string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	out, _, _ := transform.String(t, s)
	return out
}

func transliterateCyrillic(s string) string {
	var b strings.Builder
	for _, r := range s {
		if lat, ok := cyrToLat[r]; ok {
			b.WriteString(lat)
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func asciiSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "'", "")
	s = strings.ReplaceAll(s, "’", "")
	s = strings.ReplaceAll(s, " ", "-")
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			prevDash = false
		case r == '-':
			if !prevDash && b.Len() > 0 {
				b.WriteRune('-')
				prevDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	return out
}

var cyrToLat = map[rune]string{
	'а': "a", 'б': "b", 'в': "v", 'г': "h", 'ґ': "g", 'д': "d", 'е': "e", 'є': "ie",
	'ж': "zh", 'з': "z", 'и': "y", 'і': "i", 'ї': "i", 'й': "i", 'к': "k", 'л': "l",
	'м': "m", 'н': "n", 'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t", 'у': "u",
	'ф': "f", 'х': "kh", 'ц': "ts", 'ч': "ch", 'ш': "sh", 'щ': "shch", 'ь': "", 'ю': "iu",
	'я': "ia", 'ы': "y", 'э': "e", 'ё': "e", 'ъ': "",
	'А': "a", 'Б': "b", 'В': "v", 'Г': "h", 'Ґ': "g", 'Д': "d", 'Е': "e", 'Є': "ie",
	'Ж': "zh", 'З': "z", 'И': "y", 'І': "i", 'Ї': "i", 'Й': "i", 'К': "k", 'Л': "l",
	'М': "m", 'Н': "n", 'О': "o", 'П': "p", 'Р': "r", 'С': "s", 'Т': "t", 'У': "u",
	'Ф': "f", 'Х': "kh", 'Ц': "ts", 'Ч': "ch", 'Ш': "sh", 'Щ': "shch", 'Ь': "", 'Ю': "iu",
	'Я': "ia", 'Ы': "y", 'Э': "e", 'Ё': "e", 'Ъ': "",
}
