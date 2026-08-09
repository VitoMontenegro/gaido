package config

import (
	"fmt"
	"net/url"
	"strings"
)

const (
	defaultAccessSecret  = "dev-access-secret-min-32-characters!!"
	defaultRefreshSecret = "dev-refresh-secret-min-32-characters!"
)

// Validate returns an error when production configuration is unsafe.
func Validate(cfg Config) error {
	if cfg.AppEnv != "production" {
		return nil
	}
	var errs []string
	if cfg.PaymentStubEnabled {
		errs = append(errs, "PAYMENT_STUB_ENABLED must be false in production")
	}
	if cfg.SeedDemoData {
		errs = append(errs, "SEED_DEMO_DATA must be false in production")
	}
	if cfg.JWTAccessSecret == defaultAccessSecret || len(cfg.JWTAccessSecret) < 32 {
		errs = append(errs, "JWT_ACCESS_SECRET must be unique and at least 32 characters")
	}
	if cfg.JWTRefreshSecret == defaultRefreshSecret || len(cfg.JWTRefreshSecret) < 32 {
		errs = append(errs, "JWT_REFRESH_SECRET must be unique and at least 32 characters")
	}
	for _, origin := range cfg.CORSOrigins {
		if origin == "*" {
			errs = append(errs, "CORS_ORIGINS must not contain '*' in production")
			break
		}
	}
	// Local Postgres on the same host commonly uses sslmode=disable; forbid only for remote DBs.
	if strings.Contains(cfg.DatabaseURL, "sslmode=disable") && !databaseHostIsLocal(cfg.DatabaseURL) {
		errs = append(errs, "DATABASE_URL should not use sslmode=disable for a remote database")
	}
	if len(errs) > 0 {
		return fmt.Errorf("production config invalid: %s", strings.Join(errs, "; "))
	}
	return nil
}

func databaseHostIsLocal(dsn string) bool {
	host := databaseHost(dsn)
	switch strings.ToLower(host) {
	case "", "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}

func databaseHost(dsn string) string {
	u, err := url.Parse(dsn)
	if err == nil && u.Host != "" {
		return u.Hostname()
	}
	// libpq-style: postgres://user:pass@host:5432/db or key=value
	if i := strings.Index(dsn, "@"); i >= 0 {
		rest := dsn[i+1:]
		rest = strings.SplitN(rest, "/", 2)[0]
		rest = strings.SplitN(rest, "?", 2)[0]
		return strings.SplitN(rest, ":", 2)[0]
	}
	for _, part := range strings.Fields(dsn) {
		if strings.HasPrefix(part, "host=") {
			return strings.TrimPrefix(part, "host=")
		}
	}
	return ""
}
