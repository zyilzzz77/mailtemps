package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	APIAddr         string
	SMTPAddr        string
	DatabaseURL     string
	RedisAddr       string
	RedisPassword   string
	MailDomain      string
	InboxTTL        time.Duration
	MaxInboxTTL     time.Duration
	CleanupInterval time.Duration
	MaxMessageBytes int64
	CreateRateLimit int64
	TrustedOrigins  []string
}

func Load() Config {
	return Config{
		APIAddr:         env("API_ADDR", ":8081"),
		SMTPAddr:        env("SMTP_ADDR", ":2525"),
		DatabaseURL:     env("DATABASE_URL", "postgres://mailtemps:change-this-password@localhost:5432/mailtemps?sslmode=disable"),
		RedisAddr:       env("REDIS_ADDR", "localhost:6379"),
		RedisPassword:   os.Getenv("REDIS_PASSWORD"),
		MailDomain:      strings.ToLower(env("MAIL_DOMAIN", "mailtemps.space")),
		InboxTTL:        duration("INBOX_TTL", 10*time.Minute),
		MaxInboxTTL:     duration("MAX_INBOX_TTL", 30*time.Minute),
		CleanupInterval: duration("CLEANUP_INTERVAL", time.Minute),
		MaxMessageBytes: integer("MAX_MESSAGE_BYTES", 10*1024*1024),
		CreateRateLimit: integer("CREATE_RATE_LIMIT", 10),
		TrustedOrigins:  csv("TRUSTED_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001,http://100.99.104.45:3001,https://mailtemps.space"),
	}
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func duration(key string, fallback time.Duration) time.Duration {
	value, err := time.ParseDuration(env(key, fallback.String()))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func integer(key string, fallback int64) int64 {
	value, err := strconv.ParseInt(env(key, strconv.FormatInt(fallback, 10)), 10, 64)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func csv(key, fallback string) []string {
	parts := strings.Split(env(key, fallback), ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			values = append(values, value)
		}
	}
	return values
}
