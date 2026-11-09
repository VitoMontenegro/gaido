package guide

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

var ErrSlugConflict = errors.New("slug conflict")

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

const maxArticleSlugLen = 80

// ArticleSlug — публічний slug статті: відкидає URL, транслітерує кирилицю.
func ArticleSlug(raw, title string) string {
	src := strings.TrimSpace(raw)
	if !safeArticleSlugInput(src) {
		src = strings.TrimSpace(title)
	}
	out := asciiSlug(normalizeCityName(src))
	if out == "" {
		out = asciiSlug(normalizeCityName(title))
	}
	if out == "" {
		return "article"
	}
	if len(out) > maxArticleSlugLen {
		out = strings.Trim(out[:maxArticleSlugLen], "-")
	}
	return out
}

const maxWebsiteSlugLen = 140

// WebsiteSlug — slug профілю: з явного значення або з відображуваного імені.
func WebsiteSlug(raw, name string) string {
	out := asciiSlug(normalizeCityName(strings.TrimSpace(raw)))
	if out == "" {
		out = asciiSlug(normalizeCityName(name))
	}
	if out == "" {
		return "provider"
	}
	if len(out) > maxWebsiteSlugLen {
		out = strings.Trim(out[:maxWebsiteSlugLen], "-")
	}
	return out
}

// ReserveOrAllocate — явний slug лише якщо вільний; порожній — AllocateUnique з імені.
func ReserveOrAllocate(raw, name, emptyFallback string, taken func(string) (bool, error)) (string, error) {
	if strings.TrimSpace(raw) == "" {
		return AllocateUnique("", name, emptyFallback, taken)
	}
	slug := WebsiteSlug(raw, name)
	busy, err := taken(slug)
	if err != nil {
		return "", err
	}
	if busy {
		return "", ErrSlugConflict
	}
	return slug, nil
}

// AllocateUnique — slug із raw або name; якщо зайнятий, префікс з 4 випадкових цифр.
func AllocateUnique(raw, name, emptyFallback string, taken func(string) (bool, error)) (string, error) {
	base := asciiSlug(normalizeCityName(strings.TrimSpace(raw)))
	if base == "" {
		base = asciiSlug(normalizeCityName(name))
	}
	if base == "" {
		if emptyFallback != "" {
			base = emptyFallback
		} else {
			base = "profile"
		}
	}
	if len(base) > maxWebsiteSlugLen {
		base = strings.Trim(base[:maxWebsiteSlugLen], "-")
	}
	busy, err := taken(base)
	if err != nil {
		return "", err
	}
	if !busy {
		return base, nil
	}
	for i := 0; i < 8; i++ {
		n, err := randDigits4()
		if err != nil {
			return "", err
		}
		candidate := fmt.Sprintf("%d-%s", n, base)
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

func randDigits4() (int, error) {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return 0, err
	}
	return 1000 + int(binary.BigEndian.Uint32(b[:])%9000), nil
}

func safeArticleSlugInput(s string) bool {
	if s == "" {
		return false
	}
	lower := strings.ToLower(s)
	if strings.Contains(s, "://") || strings.ContainsAny(s, `/\#?`) {
		return false
	}
	return !strings.HasPrefix(lower, "http:") && !strings.HasPrefix(lower, "https:")
}

const maxExcursionThemeLen = 40
const maxExcursionThemeTokens = 4

// ExcursionPublicSlug — URL екскурсії: {місто}-{тема}-{id}. Гід його не редагує.
func ExcursionPublicSlug(id int64, citySlug, title string) string {
	idPart := strconv.FormatInt(id, 10)
	if id <= 0 {
		return asciiSlug(title)
	}
	city := asciiSlug(citySlug)
	theme := excursionThemeSlug(title, city)
	switch {
	case city != "" && theme != "":
		return city + "-" + theme + "-" + idPart
	case city != "":
		return city + "-" + idPart
	case theme != "":
		return theme + "-" + idPart
	default:
		return idPart
	}
}

// ExcursionIDFromRef читає id з /excursion/425 або /excursion/florence-uffitsi-425.
func ExcursionIDFromRef(ref string) (int64, bool) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return 0, false
	}
	if id, err := strconv.ParseInt(ref, 10, 64); err == nil && id > 0 {
		return id, true
	}
	i := strings.LastIndex(ref, "-")
	if i < 0 || i == len(ref)-1 {
		return 0, false
	}
	id, err := strconv.ParseInt(ref[i+1:], 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func excursionThemeSlug(title, citySlug string) string {
	raw := asciiSlug(normalizeCityName(title))
	if raw == "" || raw == citySlug {
		return ""
	}
	cityTok := map[string]struct{}{}
	for _, tok := range strings.Split(citySlug, "-") {
		if tok != "" {
			cityTok[tok] = struct{}{}
		}
	}
	var kept []string
	n := 0
	for _, tok := range strings.Split(raw, "-") {
		if tok == "" {
			continue
		}
		if _, skip := cityTok[tok]; skip {
			continue
		}
		if _, stop := excursionSlugStop[tok]; stop {
			continue
		}
		if len(tok) == 1 {
			continue
		}
		next := tok
		if n > 0 {
			next = strings.Join(append(append([]string{}, kept...), tok), "-")
		}
		if n >= maxExcursionThemeTokens || len(next) > maxExcursionThemeLen {
			break
		}
		kept = append(kept, tok)
		n++
	}
	out := strings.Join(kept, "-")
	if out == citySlug || similarSlug(out, citySlug) {
		return ""
	}
	return out
}

func similarSlug(a, b string) bool {
	if a == "" || b == "" || a == b {
		return a == b && a != ""
	}
	n := 5
	if len(a) < n || len(b) < n {
		return false
	}
	return strings.HasPrefix(a, b[:n]) || strings.HasPrefix(b, a[:n])
}

var excursionSlugStop = map[string]struct{}{
	"ekskursiia": {}, "ekskursii": {}, "ekskursiiu": {}, "ekskursiieiu": {},
	"prohulianka": {}, "prohulianky": {}, "prohulianku": {},
	"tur": {}, "tury": {}, "tour": {}, "tours": {}, "walk": {}, "walking": {},
	"dlia": {}, "ta": {}, "i": {}, "z": {}, "u": {}, "v": {}, "na": {}, "po": {},
	"vid": {}, "do": {}, "iak": {}, "shcho": {}, "tse": {}, "the": {}, "a": {}, "an": {},
	"and": {}, "of": {}, "with": {}, "for": {},
	"hodyna": {}, "hodyny": {}, "hodyn": {}, "hour": {}, "hours": {},
	"indyvidualna": {}, "indyvidualnu": {}, "hrupova": {}, "hrupovu": {},
	"pryvatna": {}, "pryvatnu": {},
	"misto": {}, "mistom": {}, "mistu": {}, "city": {},
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
