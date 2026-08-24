package domain

import "time"

const (
	EmailPurposeRegister = "register"
	EmailPurposeReset    = "reset"

	MailEncryptionSTARTTLS = "starttls"
	MailEncryptionTLS      = "tls"
	MailEncryptionNone     = "none"
)

type MailSettings struct {
	Enabled    bool   `json:"enabled"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Username   string `json:"username"`
	Password   string `json:"password,omitempty"`
	FromEmail  string `json:"from_email"`
	FromName   string `json:"from_name"`
	Encryption string `json:"encryption"`
}

type MailSettingsPublic struct {
	Enabled     bool   `json:"enabled"`
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Username    string `json:"username"`
	FromEmail   string `json:"from_email"`
	FromName    string `json:"from_name"`
	Encryption  string `json:"encryption"`
	HasPassword bool   `json:"has_password"`
}

type EmailToken struct {
	ID         int64
	Email      string
	Purpose    string
	TokenHash  string
	Payload    []byte
	ExpiresAt  time.Time
	LastSentAt time.Time
}

type RegisterEmailPayload struct {
	Login                string `json:"login"`
	PasswordHash         string `json:"password_hash"`
	FirstName            string `json:"first_name"`
	LastName             string `json:"last_name"`
	AsGuide              bool   `json:"as_guide"`
	AcceptPrivacy        bool   `json:"accept_privacy"`
	AcceptSiteRules      bool   `json:"accept_site_rules"`
	AcceptPlacementRules bool   `json:"accept_placement_rules"`
	Origin               string `json:"origin"`
}

type ResetEmailPayload struct {
	Origin string `json:"origin"`
}
