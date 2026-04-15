import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { tokenStorage } from "../services/tokenStorage";
import { userStorage } from "../services/userStorage";
import { LoginPayload, RegisterPayload, User } from "../types";

type AuthContextValue = {
  isLoading: boolean;
  user: User | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const tryRefreshAccessToken = async (): Promise<boolean> => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      try {
        const refreshed = await authService.refresh(refreshToken);
        await tokenStorage.setAccessToken(refreshed.access_token);
        return true;
      } catch {
        return false;
      }
    };

    const bootstrap = async () => {
      try {
        const savedUser = await userStorage.get();
        const accessToken = await tokenStorage.getAccessToken();
        const refreshToken = await tokenStorage.getRefreshToken();

        if (savedUser && (accessToken || refreshToken)) {
          setUser(savedUser);

          try {
            if (!accessToken) {
              const refreshed = await tryRefreshAccessToken();
              if (!refreshed) {
                throw new Error("Unable to refresh access token");
              }
            }

            const me = await authService.getMe();
            setUser(me);
            await userStorage.set(me);
          } catch {
            const refreshed = await tryRefreshAccessToken();
            if (refreshed) {
              try {
                const me = await authService.getMe();
                setUser(me);
                await userStorage.set(me);
                return;
              } catch {
                // fall through to clear auth state
              }
            }

            await tokenStorage.clear();
            await userStorage.clear();
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const signIn = async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    await tokenStorage.setAccessToken(data.access_token);
    await tokenStorage.setRefreshToken(data.refresh_token);
    await userStorage.set(data.user);
    setUser(data.user);
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    await tokenStorage.setAccessToken(data.access_token);
    await tokenStorage.setRefreshToken(data.refresh_token);
    await userStorage.set(data.user);
    setUser(data.user);
  };

  const signOut = async () => {
    await tokenStorage.clear();
    await userStorage.clear();
    setUser(null);
  };

  const refreshMe = async () => {
    try {
      const me = await authService.getMe();
      setUser(me);
      await userStorage.set(me);
    } catch {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        await tokenStorage.clear();
        await userStorage.clear();
        setUser(null);
        throw new Error("No refresh token available");
      }

      const refreshed = await authService.refresh(refreshToken);
      await tokenStorage.setAccessToken(refreshed.access_token);

      const me = await authService.getMe();
      setUser(me);
      await userStorage.set(me);
    }
  };

  const value = useMemo(
    () => ({ isLoading, user, signIn, register, signOut, refreshMe }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
