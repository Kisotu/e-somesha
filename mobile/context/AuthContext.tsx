import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { mapAuthErrorToMessage } from "../services/authError";
import { tokenStorage } from "../services/tokenStorage";
import { userStorage } from "../services/userStorage";
import { LoginPayload, RegisterPayload, User } from "../types";
import { bootstrapAuthSession, logoutSession, refreshCurrentUser } from "./authSession";

type AuthContextValue = {
  isLoading: boolean;
  authError: string | null;
  user: User | null;
  signIn: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const result = await bootstrapAuthSession({ authService, tokenStorage, userStorage });
        setUser(result.user);
        setAuthError(result.authError);
      } catch (error) {
        await tokenStorage.clear();
        await userStorage.clear();
        setUser(null);
        setAuthError(mapAuthErrorToMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const signIn = async (payload: LoginPayload) => {
    try {
      const data = await authService.login(payload);
      await tokenStorage.setAccessToken(data.access_token);
      await tokenStorage.setRefreshToken(data.refresh_token);
      await userStorage.set(data.user);
      setUser(data.user);
      setAuthError(null);
    } catch (error) {
      const message = mapAuthErrorToMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const data = await authService.register(payload);
      await tokenStorage.setAccessToken(data.access_token);
      await tokenStorage.setRefreshToken(data.refresh_token);
      await userStorage.set(data.user);
      setUser(data.user);
      setAuthError(null);
    } catch (error) {
      const message = mapAuthErrorToMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const signOut = async () => {
    const result = await logoutSession({ authService, tokenStorage, userStorage });
    setUser(null);
    setAuthError(result.authError);
  };

  const refreshMe = async () => {
    const result = await refreshCurrentUser({ authService, tokenStorage, userStorage });
    setUser(result.user);
    setAuthError(result.authError);

    if (result.authError) {
      throw new Error(result.authError);
    }
  };

  const value = useMemo(
    () => ({ isLoading, authError, user, signIn, register, signOut, refreshMe }),
    [isLoading, authError, user],
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
