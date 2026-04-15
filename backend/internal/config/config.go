package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort             string
	DBHost                 string
	DBPort                 int
	DBUser                 string
	DBPassword             string
	DBName                 string
	JWTSecret              string
	JWTExpiry              int
	RefreshExpiry          int
	LoginRateLimit         int
	RegisterRateLimit      int
	RefreshRateLimit       int
	RateLimitWindowSeconds int
}

func Load() *Config {
	return &Config{
		ServerPort:             getEnv("SERVER_PORT", "8080"),
		DBHost:                 getEnv("DB_HOST", "localhost"),
		DBPort:                 getEnvInt("DB_PORT", 3306),
		DBUser:                 getEnv("DB_USER", "root"),
		DBPassword:             getEnv("DB_PASSWORD", ""),
		DBName:                 getEnv("DB_NAME", "elearn"),
		JWTSecret:              getEnv("JWT_SECRET", "your-super-secret-key-change-in-production"),
		JWTExpiry:              getEnvInt("JWT_EXPIRY_HOURS", 24),
		RefreshExpiry:          getEnvInt("REFRESH_EXPIRY_DAYS", 7),
		LoginRateLimit:         getEnvInt("AUTH_LOGIN_RATE_LIMIT", 5),
		RegisterRateLimit:      getEnvInt("AUTH_REGISTER_RATE_LIMIT", 3),
		RefreshRateLimit:       getEnvInt("AUTH_REFRESH_RATE_LIMIT", 30),
		RateLimitWindowSeconds: getEnvInt("AUTH_RATE_LIMIT_WINDOW_SECONDS", 60),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
