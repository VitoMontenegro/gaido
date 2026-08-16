package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv              string
	HTTPAddr            string
	CORSOrigins         []string
	PublicBaseURL       string
	DatabaseURL         string
	RedisURL            string
	RedisSessionURL     string
	RedisSignalURL      string
	JWTAccessSecret     string
	JWTRefreshSecret    string
	JWTAccessTTL        time.Duration
	JWTRefreshTTL       time.Duration
	PaymentStubEnabled  bool
	MediaStoragePath    string
	MediaMaxUploadBytes int64
	SeedDemoData        bool
	TrustProxy          bool
	StaticDir           string
	StaticRoot          string
	StaticHostMap       map[string]string
	DeployEnabled       bool
	DeployScript        string
	DeployLog           string
	DeployAPILog        string
	DeployAppSlug       string
	GitBranch           string
	TelegramEnabled     bool
	TelegramBotToken    string
	TelegramBotUsername string
	TelegramGroupChatID int64
	TelegramWebhookSecret string
}

func Load() Config {
	return Config{
		AppEnv:              getEnv("APP_ENV", "development"),
		HTTPAddr:            getEnv("HTTP_ADDR", ":8081"),
		CORSOrigins:         splitCSV(getEnv("CORS_ORIGINS", "http://localhost:5173")),
		PublicBaseURL:       getEnv("PUBLIC_BASE_URL", "http://localhost:5173"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://tourister:tourister@localhost:5433/tourister?sslmode=disable"),
		RedisURL:            getEnv("REDIS_URL", "redis://localhost:6380/0"),
		RedisSessionURL:     getEnv("REDIS_SESSION_URL", "redis://localhost:6380/1"),
		RedisSignalURL:      getEnv("REDIS_SIGNAL_URL", "redis://localhost:6380/2"),
		JWTAccessSecret:     getEnv("JWT_ACCESS_SECRET", "dev-access-secret-min-32-characters!!"),
		JWTRefreshSecret:    getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-min-32-characters!"),
		JWTAccessTTL:        parseDuration(getEnv("JWT_ACCESS_TTL", "15m"), 15*time.Minute),
		JWTRefreshTTL:       parseDuration(getEnv("JWT_REFRESH_TTL", "720h"), 720*time.Hour),
		PaymentStubEnabled:  getEnv("PAYMENT_STUB_ENABLED", "true") == "true",
		MediaStoragePath:    getEnv("MEDIA_STORAGE_PATH", "./storage"),
		MediaMaxUploadBytes: int64(getEnvInt("MEDIA_MAX_UPLOAD_MB", 10)) * 1024 * 1024,
		SeedDemoData:        seedDemoDataEnabled(getEnv("APP_ENV", "development"), getEnv("SEED_DEMO_DATA", "")),
		TrustProxy:          getEnv("TRUST_PROXY", "false") == "true",
		StaticDir:           getEnv("STATIC_DIR", "../apps/portal/dist"),
		StaticRoot:          getEnv("STATIC_ROOT", ""),
		StaticHostMap:       parseHostMap(getEnv("STATIC_HOST_MAP", "")),
		DeployEnabled:       getEnv("DEPLOY_ENABLED", "false") == "true",
		DeployScript:        getEnv("DEPLOY_SCRIPT", ""),
		DeployLog:           getEnv("DEPLOY_LOG", ""),
		DeployAPILog:        getEnv("API_LOG", ""),
		DeployAppSlug:       getEnv("DEPLOY_APP_SLUG", "web-prod-2026"),
		GitBranch:           getEnv("GIT_BRANCH", "main"),
		TelegramEnabled:     getEnv("TELEGRAM_ENABLED", "false") == "true",
		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramBotUsername: getEnv("TELEGRAM_BOT_USERNAME", ""),
		TelegramGroupChatID: int64(getEnvInt("TELEGRAM_GROUP_CHAT_ID", 0)),
		TelegramWebhookSecret: getEnv("TELEGRAM_WEBHOOK_SECRET", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func parseDuration(s string, fallback time.Duration) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}

func splitCSV(s string) []string {
	var out []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := s[start:i]
			if part != "" {
				out = append(out, part)
			}
			start = i + 1
		}
	}
	if len(out) == 0 {
		return []string{s}
	}
	return out
}

func seedDemoDataEnabled(appEnv, explicit string) bool {
	if appEnv == "production" {
		return false
	}
	return explicit == "true"
}

func parseHostMap(raw string) map[string]string {
	defaults := map[string]string{
		"gaido.top":        "portal",
		"www.gaido.top":    "portal",
		"svit.gaido.top":   "svit",
		"servis.gaido.top": "servis",
		"vezu.gaido.top":   "vezu",
		"localhost":        "portal",
		"127.0.0.1":        "portal",
	}
	if raw == "" {
		return defaults
	}
	out := make(map[string]string, len(defaults)+4)
	for k, v := range defaults {
		out[k] = v
	}
	for _, pair := range splitCSV(raw) {
		host, sub, ok := strings.Cut(pair, "=")
		if !ok {
			continue
		}
		host = strings.ToLower(strings.TrimSpace(host))
		sub = strings.TrimSpace(sub)
		if host != "" && sub != "" {
			out[host] = sub
		}
	}
	return out
}
