import axios from "axios";

const NETWORK_ERROR_MESSAGES = new Set(["Network Error", "timeout exceeded"]);

const toMessage = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
};

export const mapAuthErrorToMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return "Authentication failed. Please try again.";
  }

  const status = error.response?.status;
  const backendError = toMessage(error.response?.data?.error);

  if (!status) {
    if (NETWORK_ERROR_MESSAGES.has(error.message)) {
      return "Cannot reach the server. Check your internet connection and try again.";
    }
    return "Request timed out or network is unavailable. Please try again.";
  }

  if (status === 401) {
    return "Your session is invalid or expired. Please sign in again.";
  }

  if (status === 400 || status === 409) {
    return backendError || "Invalid authentication details. Please review your input.";
  }

  if (status >= 500) {
    return "Server is temporarily unavailable. Please try again shortly.";
  }

  return backendError || "Authentication request failed. Please try again.";
};
