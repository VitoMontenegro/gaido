package config

import (
	"fmt"
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
	if strings.Contains(cfg.DatabaseURL, "sslmode=disable") {
		errs = append(errs, "DATABASE_URL should not use sslmode=disable in production")
	}
	if len(errs) > 0 {
		return fmt.Errorf("production config invalid: %s", strings.Join(errs, "; "))
	}
	return nil
}
