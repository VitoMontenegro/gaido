package identity

import (
	"errors"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

const MaxProfileSlugLen = 140

var ErrSlugConflict = errors.New("slug conflict")

func ProfileSlug(name, fallback string) string {
	out := underscoreSlug(normalizeName(name))
	if out == "" {
		out = underscoreSlug(fallback)
	}
	if out == "" {
		out = fallback
	}
	if out == "" {
		out = "profile"
	}
	if len(out) > MaxProfileSlugLen {
		out = strings.Trim(out[:MaxProfileSlugLen], "_")
	}
	if len(out) < 3 {
		out = (out + "_xx")[:3]
	}
	return out
}

func AllocateProfileSlug(name, fallback string, taken func(string) (bool, error)) (string, error) {
	base := ProfileSlug(name, fallback)
	busy, err := taken(base)
	if err != nil {
		return "", err
	}
	if !busy {
		return base, nil
	}
	for i := 0; i < 8; i++ {
		suf, err := randomToken(4)
		if err != nil {
			return "", err
		}
		candidate := trimSlug(base + "_" + suf)
		busy, err = taken(candidate)
		if err != nil {
			return "", err
		}
		if !busy {
			return candidate, nil
		}
	}
	return "", ErrSlugConflict
}

func ValidNewProfileSlug(slug string) bool {
	n := len(slug)
	if n < 3 || n > MaxProfileSlugLen {
		return false
	}
	if strings.HasPrefix(slug, "_") || strings.HasSuffix(slug, "_") || strings.Contains(slug, "__") {
		return false
	}
	for _, r := range slug {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '_' {
			return false
		}
	}
	return true
}

func ValidExistingProfileSlug(slug string) bool {
	n := len(slug)
	if n < 1 || n > 150 {
		return false
	}
	for _, r := range slug {
		if (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') && (r < '0' || r > '9') && r != '_' && r != '-' && r != '.' {
			return false
		}
	}
	return true
}

func trimSlug(s string) string {
	if len(s) > MaxProfileSlugLen {
		s = strings.Trim(s[:MaxProfileSlugLen], "_")
	}
	return s
}

func underscoreSlug(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "'", "")
	s = strings.ReplaceAll(s, "’", "")
	s = strings.ReplaceAll(s, " ", "_")
	s = strings.ReplaceAll(s, "-", "_")
	var b strings.Builder
	prev := false
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			prev = false
		case r == '_':
			if !prev && b.Len() > 0 {
				b.WriteRune('_')
				prev = true
			}
		}
	}
	return strings.Trim(b.String(), "_")
}

func normalizeName(name string) string {
	name = strings.TrimSpace(name)
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	out, _, _ := transform.String(t, name)
	var b strings.Builder
	for _, r := range out {
		switch r {
		case 'ł', 'Ł':
			b.WriteRune('l')
		case 'đ', 'Đ':
			b.WriteRune('d')
		case 'ß':
			b.WriteString("ss")
		default:
			if lat, ok := cyrToLat[r]; ok {
				b.WriteString(lat)
			} else {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
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
