package config

import (
	"strings"
	"testing"
)

func TestValidate_devPasses(t *testing.T) {
	cfg := Config{
		AppEnv:             "development",
		PaymentStubEnabled: true,
		SeedDemoData:       true,
		JWTAccessSecret:    defaultAccessSecret,
		JWTRefreshSecret:   defaultRefreshSecret,
		CORSOrigins:        []string{"http://localhost:5173"},
		DatabaseURL:        "postgres://localhost:5433/t?sslmode=disable",
	}
	if err := Validate(cfg); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}

func TestValidate_productionInvalid(t *testing.T) {
	cfg := Config{
		AppEnv:             "production",
		PaymentStubEnabled: true,
		SeedDemoData:       true,
		JWTAccessSecret:    defaultAccessSecret,
		JWTRefreshSecret:   defaultRefreshSecret,
		CORSOrigins:        []string{"*"},
		DatabaseURL:        "postgres://db.example.com:5432/t?sslmode=disable",
	}
	err := Validate(cfg)
	if err == nil {
		t.Fatal("expected error")
	}
	msg := err.Error()
	for _, sub := range []string{
		"PAYMENT_STUB_ENABLED",
		"SEED_DEMO_DATA",
		"JWT_ACCESS_SECRET",
		"JWT_REFRESH_SECRET",
		"CORS_ORIGINS",
		"sslmode=disable",
	} {
		if !strings.Contains(msg, sub) {
			t.Errorf("expected error to mention %q, got: %s", sub, msg)
		}
	}
}

func TestValidate_productionValid(t *testing.T) {
	cfg := Config{
		AppEnv:             "production",
		PaymentStubEnabled: false,
		SeedDemoData:       false,
		JWTAccessSecret:    "prod-access-secret-that-is-long-enough-32",
		JWTRefreshSecret:   "prod-refresh-secret-that-is-long-enough-32",
		CORSOrigins:        []string{"https://example.com"},
		DatabaseURL:        "postgres://user:pass@host:5432/db?sslmode=require",
	}
	if err := Validate(cfg); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}

func TestValidate_productionLocalPostgresSSLDisableOK(t *testing.T) {
	cfg := Config{
		AppEnv:             "production",
		PaymentStubEnabled: false,
		SeedDemoData:       false,
		JWTAccessSecret:    "prod-access-secret-that-is-long-enough-32",
		JWTRefreshSecret:   "prod-refresh-secret-that-is-long-enough-32",
		CORSOrigins:        []string{"https://gaido.top"},
		DatabaseURL:        "postgres://tourister:x@127.0.0.1:5432/tourister?sslmode=disable",
	}
	if err := Validate(cfg); err != nil {
		t.Fatalf("local postgres sslmode=disable should pass, got %v", err)
	}
}
