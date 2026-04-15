const API_ENV = (process.env.EXPO_PUBLIC_API_ENV ?? "dev").toLowerCase();

const API_BASE_URL_BY_ENV: Record<string, string | undefined> = {
  dev: process.env.EXPO_PUBLIC_API_BASE_URL_DEV,
  staging: process.env.EXPO_PUBLIC_API_BASE_URL_STAGING,
  prod: process.env.EXPO_PUBLIC_API_BASE_URL_PROD,
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  API_BASE_URL_BY_ENV[API_ENV] ??
  "http://localhost:8080/api";

export const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  user: "user",
  lastSync: "last_sync",
} as const;
