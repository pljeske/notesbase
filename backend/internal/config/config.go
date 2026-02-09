package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	AllowedOrigins  string
	ShutdownTimeout time.Duration

	// MinIO / S3
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioUseSSL    bool
	MaxUploadSize  int64
}

func Load() *Config {
	return &Config{
		Port:            getEnv("SERVER_PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://notes:notes@localhost:5432/notesapp?sslmode=disable"),
		AllowedOrigins:  getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
		ShutdownTimeout: getDuration("SHUTDOWN_TIMEOUT", 10*time.Second),

		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucket:    getEnv("MINIO_BUCKET", "notes-files"),
		MinioUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
		MaxUploadSize:  getInt64("MAX_UPLOAD_SIZE", 52428800),
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

func getInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err == nil {
			return n
		}
	}
	return fallback
}
