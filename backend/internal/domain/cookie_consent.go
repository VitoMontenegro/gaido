package domain

import (
	"encoding/json"
	"time"
)

type CookieConsent struct {
	ID             int64
	ConsentToken   string
	UserID         *int64
	IP             string
	UserAgent      string
	AcceptLanguage string
	Referer        string
	PageURL        string
	BrowserInfo    json.RawMessage
	CreatedAt      time.Time
}
