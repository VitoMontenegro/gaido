package identity

import (
	"crypto/rand"
	"fmt"
	"strings"
	"unicode"
)

const loginAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

func GenerateLogin() (string, error) {
	suffix, err := randomToken(6)
	if err != nil {
		return "", err
	}
	return "user_" + suffix, nil
}

func ValidGeneratedLogin(login string) bool {
	n := len(login)
	if n < 3 || n > 32 {
		return false
	}
	for _, r := range login {
		if (r < 'a' || r > 'z') && (r < '0' || r > '9') && r != '_' {
			return false
		}
	}
	return !strings.HasPrefix(login, "_") && !strings.HasSuffix(login, "_") && !strings.Contains(login, "__")
}

func ValidExistingLogin(login string) bool {
	n := len(login)
	if n < 3 || n > 32 {
		return false
	}
	for _, r := range login {
		if (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') && (r < '0' || r > '9') && r != '_' && r != '.' && r != '-' {
			return false
		}
	}
	return true
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, n)
	for i := range b {
		out[i] = loginAlphabet[int(b[i])%len(loginAlphabet)]
	}
	return string(out), nil
}

func GoogleEmailTrusted(email string, verified bool, hd string) bool {
	if !verified {
		return false
	}
	email = NormalizeEmail(email)
	if strings.HasSuffix(email, "@gmail.com") {
		return true
	}
	return strings.TrimSpace(hd) != ""
}

func SplitProviderName(full string) (first, last string) {
	full = strings.TrimSpace(full)
	if full == "" {
		return "", ""
	}
	parts := strings.FieldsFunc(full, func(r rune) bool { return unicode.IsSpace(r) })
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

func FormatErr(err error) string {
	if err == nil {
		return ""
	}
	return fmt.Sprint(err)
}
