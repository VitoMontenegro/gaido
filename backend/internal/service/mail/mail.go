package mail

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

const settingsKey = "mail_settings"

type Service struct {
	Settings *postgres.SettingsRepo
}

func NewService(settings *postgres.SettingsRepo) *Service {
	return &Service{Settings: settings}
}

func (s *Service) Load(ctx context.Context) (domain.MailSettings, error) {
	var cfg domain.MailSettings
	err := s.Settings.GetJSON(ctx, settingsKey, &cfg)
	if errors.Is(err, pgx.ErrNoRows) {
		return defaultSettings(), nil
	}
	if err != nil {
		return domain.MailSettings{}, err
	}
	return normalize(cfg, ""), nil
}

func (s *Service) Save(ctx context.Context, in domain.MailSettings) (domain.MailSettings, error) {
	current, err := s.Load(ctx)
	if err != nil {
		return domain.MailSettings{}, err
	}
	next := normalize(in, current.Password)
	if err := s.Settings.SetJSON(ctx, settingsKey, next); err != nil {
		return domain.MailSettings{}, err
	}
	return next, nil
}

func (s *Service) Public(cfg domain.MailSettings) domain.MailSettingsPublic {
	return domain.MailSettingsPublic{
		Enabled:     cfg.Enabled,
		Host:        cfg.Host,
		Port:        cfg.Port,
		Username:    cfg.Username,
		FromEmail:   cfg.FromEmail,
		FromName:    cfg.FromName,
		Encryption:  cfg.Encryption,
		HasPassword: cfg.Password != "",
	}
}

func Configured(cfg domain.MailSettings) bool {
	return cfg.Enabled && cfg.Host != "" && cfg.FromEmail != "" && cfg.Port > 0
}

func (s *Service) Send(ctx context.Context, to, subject, body string) error {
	cfg, err := s.Load(ctx)
	if err != nil {
		return err
	}
	if !Configured(cfg) {
		return ErrNotConfigured
	}
	return sendSMTP(cfg, to, subject, body)
}

var ErrNotConfigured = errors.New("mail is not configured")

func defaultSettings() domain.MailSettings {
	return domain.MailSettings{
		Port:       587,
		Encryption: domain.MailEncryptionSTARTTLS,
		FromName:   "Gaido",
	}
}

func normalize(in domain.MailSettings, keepPassword string) domain.MailSettings {
	out := defaultSettings()
	out.Enabled = in.Enabled
	out.Host = strings.TrimSpace(in.Host)
	if in.Port > 0 && in.Port <= 65535 {
		out.Port = in.Port
	}
	out.Username = strings.TrimSpace(in.Username)
	out.FromEmail = strings.TrimSpace(in.FromEmail)
	out.FromName = strings.TrimSpace(in.FromName)
	if out.FromName == "" {
		out.FromName = "Gaido"
	}
	switch strings.ToLower(strings.TrimSpace(in.Encryption)) {
	case domain.MailEncryptionTLS, domain.MailEncryptionNone, domain.MailEncryptionSTARTTLS:
		out.Encryption = strings.ToLower(strings.TrimSpace(in.Encryption))
	}
	if strings.TrimSpace(in.Password) != "" {
		out.Password = in.Password
	} else {
		out.Password = keepPassword
	}
	return out
}

func sendSMTP(cfg domain.MailSettings, to, subject, body string) error {
	from := strings.TrimSpace(cfg.FromEmail)
	if from == "" {
		from = cfg.Username
	}
	if from == "" || to == "" || cfg.Host == "" {
		return ErrNotConfigured
	}
	headerFrom := from
	if name := strings.TrimSpace(cfg.FromName); name != "" {
		headerFrom = fmt.Sprintf("\"%s\" <%s>", strings.ReplaceAll(name, "\"", ""), from)
	}
	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		headerFrom, to, encodeSubject(subject), body,
	))
	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	var auth smtp.Auth
	if cfg.Username != "" {
		auth = smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
	}
	switch cfg.Encryption {
	case domain.MailEncryptionTLS:
		return sendTLS(addr, cfg.Host, auth, from, to, msg)
	case domain.MailEncryptionNone:
		return smtp.SendMail(addr, auth, from, []string{to}, msg)
	default:
		return sendStartTLS(addr, cfg.Host, auth, from, to, msg)
	}
}

func encodeSubject(s string) string {
	return "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte(s)) + "?="
}

func sendStartTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	conn, err := net.DialTimeout("tcp", addr, 15*time.Second)
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	}
	return finishSMTP(client, auth, from, to, msg)
}

func sendTLS(addr, host string, auth smtp.Auth, from, to string, msg []byte) error {
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 15 * time.Second}, "tcp", addr, &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	defer client.Close()
	return finishSMTP(client, auth, from, to, msg)
}

func finishSMTP(client *smtp.Client, auth smtp.Auth, from, to string, msg []byte) error {
	if auth != nil {
		if ok, _ := client.Extension("AUTH"); ok {
			if err := client.Auth(auth); err != nil {
				return err
			}
		}
	}
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(msg); err != nil {
		_ = w.Close()
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	return client.Quit()
}
