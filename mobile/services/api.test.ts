import { beforeEach, describe, expect, it, vi } from "vitest";

let requestInterceptor: ((config: Record<string, unknown>) => Promise<Record<string, unknown>>) | null =
  null;
let responseErrorInterceptor: ((error: Record<string, unknown>) => Promise<unknown>) | null = null;

type AxiosLikeInstance = {
  interceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const buildAxiosInstance = (captureInterceptors: boolean): AxiosLikeInstance & ((...args: unknown[]) => Promise<unknown>) => {
  const fn = vi.fn(async () => ({ data: {} })) as unknown as AxiosLikeInstance &
    ((...args: unknown[]) => Promise<unknown>);

  fn.interceptors = {
    request: {
      use: vi.fn((handler) => {
        if (captureInterceptors) {
          requestInterceptor = handler;
        }
      }),
    },
    response: {
      use: vi.fn((_success, errorHandler) => {
        if (captureInterceptors) {
          responseErrorInterceptor = errorHandler;
        }
      }),
    },
  };
  fn.post = vi.fn();
  fn.get = vi.fn();

  return fn;
};

const refreshClient = buildAxiosInstance(false);
const apiClient = buildAxiosInstance(true);

const axiosCreate = vi.fn(() => {
  if (axiosCreate.mock.calls.length === 1) {
    return refreshClient;
  }

  return apiClient;
});

vi.mock("axios", () => {
  return {
    default: {
      create: axiosCreate,
      isAxiosError: (value: unknown) => Boolean((value as { isAxiosError?: boolean })?.isAxiosError),
    },
    create: axiosCreate,
  };
});

const mockedTokenStorage = {
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  setAccessToken: vi.fn<(value: string) => Promise<void>>(),
  getRefreshToken: vi.fn<() => Promise<string | null>>(),
  setRefreshToken: vi.fn<(value: string) => Promise<void>>(),
  clear: vi.fn<() => Promise<void>>(),
};

const mockedUserStorage = {
  clear: vi.fn<() => Promise<void>>(),
};

vi.mock("./tokenStorage", () => ({
  tokenStorage: mockedTokenStorage,
}));

vi.mock("./userStorage", () => ({
  userStorage: mockedUserStorage,
}));

describe("api interceptors", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    requestInterceptor = null;
    responseErrorInterceptor = null;

    await import("./api");
  });

  it("attaches bearer token to request headers", async () => {
    mockedTokenStorage.getAccessToken.mockResolvedValue("access-123");

    if (!requestInterceptor) {
      throw new Error("request interceptor not captured");
    }

    const config = { headers: {} };
    await requestInterceptor(config);

    expect(config.headers).toEqual({ Authorization: "Bearer access-123" });
  });

  it("refreshes token on 401 and retries original request", async () => {
    mockedTokenStorage.getRefreshToken.mockResolvedValue("refresh-1");
    refreshClient.post.mockResolvedValue({
      data: {
        access_token: "new-access",
        refresh_token: "new-refresh",
      },
    });

    if (!responseErrorInterceptor) {
      throw new Error("response error interceptor not captured");
    }

    const originalRequest = { url: "/courses", headers: {} };
    const error = {
      config: originalRequest,
      response: { status: 401 },
    };

    await responseErrorInterceptor(error);

    expect(refreshClient.post).toHaveBeenCalledWith("/auth/refresh", {
      refresh_token: "refresh-1",
    });
    expect(mockedTokenStorage.setAccessToken).toHaveBeenCalledWith("new-access");
    expect(mockedTokenStorage.setRefreshToken).toHaveBeenCalledWith("new-refresh");
    expect(apiClient).toHaveBeenCalledWith(originalRequest);
  });

  it("clears local auth state when refresh fails", async () => {
    mockedTokenStorage.getRefreshToken.mockResolvedValue("refresh-1");
    refreshClient.post.mockRejectedValue(new Error("refresh failed"));

    if (!responseErrorInterceptor) {
      throw new Error("response error interceptor not captured");
    }

    const originalRequest = { url: "/courses", headers: {} };
    const error = {
      config: originalRequest,
      response: { status: 401 },
    };

    await expect(responseErrorInterceptor(error)).rejects.toBeInstanceOf(Error);
    expect(mockedTokenStorage.clear).toHaveBeenCalledTimes(1);
    expect(mockedUserStorage.clear).toHaveBeenCalledTimes(1);
  });
});
