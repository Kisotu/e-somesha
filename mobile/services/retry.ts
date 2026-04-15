import axios from "axios";

type RetryOptions = {
  retries?: number;
  initialDelayMs?: number;
};

const DEFAULT_RETRIES = 2;
const DEFAULT_INITIAL_DELAY_MS = 300;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isTransientStatus = (status: number): boolean => {
  return status === 408 || status === 429 || status >= 500;
};

const isTransientError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return isTransientStatus(error.response.status);
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> => {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const initialDelayMs = options?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;

  let delayMs = initialDelayMs;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const canRetry = attempt < retries && isTransientError(error);
      if (!canRetry) {
        throw error;
      }

      await sleep(delayMs);
      delayMs *= 2;
    }
  }

  throw new Error("Retry operation exhausted unexpectedly");
};
