import { describe, expect, it, vi } from "vitest";
import {
  bootstrapAuthSession,
  logoutSession,
  refreshCurrentUser,
  tryRefreshAccessToken,
} from "./authSession";

const makeUser = () => ({
  id: 1,
  email: "student@example.com",
  name: "Student",
  role: "student" as const,
});

const createDeps = () => {
  const authService = {
    refresh: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
  };

  const tokenStorage = {
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clear: vi.fn(),
  };

  const userStorage = {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  };

  return { authService, tokenStorage, userStorage };
};

describe("authSession", () => {
  it("bootstraps with valid saved session and refreshes user profile", async () => {
    const deps = createDeps();
    const savedUser = makeUser();
    const freshUser = { ...savedUser, name: "Updated Student" };

    deps.userStorage.get.mockResolvedValue(savedUser);
    deps.tokenStorage.getAccessToken.mockResolvedValue("access-token");
    deps.tokenStorage.getRefreshToken.mockResolvedValue("refresh-token");
    deps.authService.getMe.mockResolvedValue(freshUser);

    const result = await bootstrapAuthSession(deps);

    expect(result).toEqual({ user: freshUser, authError: null });
    expect(deps.userStorage.set).toHaveBeenCalledWith(freshUser);
    expect(deps.tokenStorage.clear).not.toHaveBeenCalled();
  });

  it("refreshCurrentUser succeeds after access token failure by using refresh", async () => {
    const deps = createDeps();
    const freshUser = makeUser();

    deps.authService.getMe
      .mockRejectedValueOnce(new Error("expired access token"))
      .mockResolvedValueOnce(freshUser);
    deps.tokenStorage.getRefreshToken.mockResolvedValue("refresh-token");
    deps.authService.refresh.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
    });

    const result = await refreshCurrentUser(deps);

    expect(result).toEqual({ user: freshUser, authError: null });
    expect(deps.tokenStorage.setAccessToken).toHaveBeenCalledWith("new-access");
    expect(deps.tokenStorage.setRefreshToken).toHaveBeenCalledWith("new-refresh");
    expect(deps.userStorage.set).toHaveBeenCalledWith(freshUser);
  });

  it("refreshCurrentUser clears local auth state when refresh fails", async () => {
    const deps = createDeps();

    deps.authService.getMe.mockRejectedValue(new Error("expired access token"));
    deps.tokenStorage.getRefreshToken.mockResolvedValue("refresh-token");
    deps.authService.refresh.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
      message: "Request failed",
    });

    const result = await refreshCurrentUser(deps);

    expect(result.user).toBeNull();
    expect(result.authError).toBe("Your session is invalid or expired. Please sign in again.");
    expect(deps.tokenStorage.clear).toHaveBeenCalledTimes(1);
    expect(deps.userStorage.clear).toHaveBeenCalledTimes(1);
  });

  it("logoutSession revokes server token and clears local auth", async () => {
    const deps = createDeps();

    deps.tokenStorage.getRefreshToken.mockResolvedValue("refresh-token");
    deps.authService.logout.mockResolvedValue(undefined);

    const result = await logoutSession(deps);

    expect(result).toEqual({ authError: null });
    expect(deps.authService.logout).toHaveBeenCalledWith("refresh-token");
    expect(deps.tokenStorage.clear).toHaveBeenCalledTimes(1);
    expect(deps.userStorage.clear).toHaveBeenCalledTimes(1);
  });

  it("tryRefreshAccessToken persists rotated token", async () => {
    const deps = createDeps();

    deps.tokenStorage.getRefreshToken.mockResolvedValue("refresh-token");
    deps.authService.refresh.mockResolvedValue({
      access_token: "new-access",
      refresh_token: "new-refresh",
    });

    const result = await tryRefreshAccessToken(deps);

    expect(result).toEqual({ ok: true, errorMessage: null });
    expect(deps.tokenStorage.setAccessToken).toHaveBeenCalledWith("new-access");
    expect(deps.tokenStorage.setRefreshToken).toHaveBeenCalledWith("new-refresh");
  });
});
