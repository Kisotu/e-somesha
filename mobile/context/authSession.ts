import { mapAuthErrorToMessage } from "../services/authError";
import { User } from "../types";

type RefreshResponse = {
  access_token: string;
  refresh_token?: string;
};

type AuthServiceDeps = {
  refresh: (refreshToken: string) => Promise<RefreshResponse>;
  getMe: () => Promise<User>;
  logout: (refreshToken: string) => Promise<void>;
};

type TokenStorageDeps = {
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (value: string) => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (value: string) => Promise<void>;
  clear: () => Promise<void>;
};

type UserStorageDeps = {
  get: () => Promise<User | null>;
  set: (user: User) => Promise<void>;
  clear: () => Promise<void>;
};

type AuthSessionDeps = {
  authService: AuthServiceDeps;
  tokenStorage: TokenStorageDeps;
  userStorage: UserStorageDeps;
};

export type AuthSessionResult = {
  user: User | null;
  authError: string | null;
};

export const tryRefreshAccessToken = async ({
  authService,
  tokenStorage,
}: Pick<AuthSessionDeps, "authService" | "tokenStorage">): Promise<{ ok: boolean; errorMessage: string | null }> => {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return { ok: false, errorMessage: "No refresh token available" };
  }

  try {
    const refreshed = await authService.refresh(refreshToken);
    await tokenStorage.setAccessToken(refreshed.access_token);
    if (refreshed.refresh_token) {
      await tokenStorage.setRefreshToken(refreshed.refresh_token);
    }
    return { ok: true, errorMessage: null };
  } catch (error) {
    return { ok: false, errorMessage: mapAuthErrorToMessage(error) };
  }
};

export const bootstrapAuthSession = async ({
  authService,
  tokenStorage,
  userStorage,
}: AuthSessionDeps): Promise<AuthSessionResult> => {
  const savedUser = await userStorage.get();
  const accessToken = await tokenStorage.getAccessToken();
  const refreshToken = await tokenStorage.getRefreshToken();

  if (!savedUser || (!accessToken && !refreshToken)) {
    return { user: null, authError: null };
  }

  try {
    if (!accessToken) {
      const refreshed = await tryRefreshAccessToken({ authService, tokenStorage });
      if (!refreshed.ok) {
        await tokenStorage.clear();
        await userStorage.clear();
        return {
          user: null,
          authError: refreshed.errorMessage ?? "Unable to restore your session. Please sign in again.",
        };
      }
    }

    const me = await authService.getMe();
    await userStorage.set(me);
    return { user: me, authError: null };
  } catch {
    const refreshed = await tryRefreshAccessToken({ authService, tokenStorage });
    if (!refreshed.ok) {
      await tokenStorage.clear();
      await userStorage.clear();
      return {
        user: null,
        authError: refreshed.errorMessage ?? "Unable to restore your session. Please sign in again.",
      };
    }

    try {
      const me = await authService.getMe();
      await userStorage.set(me);
      return { user: me, authError: null };
    } catch (error) {
      await tokenStorage.clear();
      await userStorage.clear();
      return {
        user: null,
        authError: mapAuthErrorToMessage(error),
      };
    }
  }
};

export const refreshCurrentUser = async ({
  authService,
  tokenStorage,
  userStorage,
}: AuthSessionDeps): Promise<AuthSessionResult> => {
  try {
    const me = await authService.getMe();
    await userStorage.set(me);
    return { user: me, authError: null };
  } catch {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await tokenStorage.clear();
      await userStorage.clear();
      return { user: null, authError: "No refresh token available" };
    }

    try {
      const refreshed = await authService.refresh(refreshToken);
      await tokenStorage.setAccessToken(refreshed.access_token);
      if (refreshed.refresh_token) {
        await tokenStorage.setRefreshToken(refreshed.refresh_token);
      }

      const me = await authService.getMe();
      await userStorage.set(me);
      return { user: me, authError: null };
    } catch (error) {
      await tokenStorage.clear();
      await userStorage.clear();
      return { user: null, authError: mapAuthErrorToMessage(error) };
    }
  }
};

export const logoutSession = async ({
  authService,
  tokenStorage,
  userStorage,
}: AuthSessionDeps): Promise<{ authError: string | null }> => {
  let logoutError: string | null = null;
  const refreshToken = await tokenStorage.getRefreshToken();

  if (refreshToken) {
    try {
      await authService.logout(refreshToken);
    } catch (error) {
      logoutError = mapAuthErrorToMessage(error);
    }
  }

  await tokenStorage.clear();
  await userStorage.clear();

  if (logoutError) {
    return {
      authError: "Signed out on this device. Server session revoke may have failed.",
    };
  }

  return { authError: null };
};
