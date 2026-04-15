import { api } from "./api";
import {
  LoginPayload,
  LoginResponse,
  RefreshResponse,
  RegisterPayload,
  User,
} from "../types";

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/register", payload);
    return data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await api.post<RefreshResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post("/auth/logout", {
      refresh_token: refreshToken,
    });
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>("/users/me");
    return data;
  },
};
