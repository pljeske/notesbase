package config

import (
	"os"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	AllowedOrigins  string
	ShutdownTimeout time.Duration
}

func Load() *Config {
	return &Config{
		Port:            getEnv("SERVER_PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://notes:notes@localhost:5432/notesapp?sslmode=disable"),
		AllowedOrigins:  getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		ShutdownTimeout: getDuration("SHUTDOWN_TIMEOUT", 10*time.Second),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		d, err := time.ParseDuration(v)
		if err == nil {
			return d
		}
	}
	return fallback
}
