const API_ENV = (process.env.EXPO_PUBLIC_API_ENV ?? "dev").toLowerCase();

const PROD_FALLBACK_API_BASE_URL = "https://oloishorua-go-backend.hf.space/api";

const API_BASE_URL_BY_ENV: Record<string, string | undefined> = {
  dev: process.env.EXPO_PUBLIC_API_BASE_URL_DEV,
  staging: process.env.EXPO_PUBLIC_API_BASE_URL_STAGING,
  prod: process.env.EXPO_PUBLIC_API_BASE_URL_PROD ?? PROD_FALLBACK_API_BASE_URL,
};

const DEV_FALLBACK_API_BASE_URL = "http://localhost:8080/api";

const isHttpsUrl = (value: string): boolean => value.startsWith("https://");

const isAllowedDevHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:") {
      return false;
    }

    return ["localhost", "127.0.0.1", "10.0.2.2"].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const resolveApiBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL ?? API_BASE_URL_BY_ENV[API_ENV];

  if (configured) {
    if (isHttpsUrl(configured)) {
      return configured;
    }

    if (API_ENV === "dev" && isAllowedDevHttpUrl(configured)) {
      return configured;
    }

    throw new Error(
      `Invalid EXPO_PUBLIC_API_BASE_URL for env '${API_ENV}'. Use https:// for non-local endpoints.`,
    );
  }

  if (API_ENV === "dev") {
    return DEV_FALLBACK_API_BASE_URL;
  }

  throw new Error(
    `Missing API base URL for env '${API_ENV}'. Set EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_BASE_URL_${API_ENV.toUpperCase()}.`,
  );
};

export const API_BASE_URL = resolveApiBaseUrl();

export const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  user: "user",
  lastSync: "last_sync",
} as const;
