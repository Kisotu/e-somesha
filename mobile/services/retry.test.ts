import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("retries transient axios errors and eventually succeeds", async () => {
    const transientError = {
      isAxiosError: true,
      response: { status: 503 },
      message: "Service Unavailable",
    };

    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValue("ok");

    const result = await withRetry(operation, { retries: 2, initialDelayMs: 0 });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-transient axios errors", async () => {
    const nonTransientError = {
      isAxiosError: true,
      response: { status: 400 },
      message: "Bad Request",
    };

    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(nonTransientError);

    await expect(withRetry(operation, { retries: 2, initialDelayMs: 0 })).rejects.toBe(nonTransientError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries network errors with no response", async () => {
    const networkError = {
      isAxiosError: true,
      message: "Network Error",
    };

    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue("ok");

    const result = await withRetry(operation, { retries: 1, initialDelayMs: 0 });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-axios errors", async () => {
    const error = new Error("Unexpected");
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(error);

    await expect(withRetry(operation, { retries: 2, initialDelayMs: 0 })).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
