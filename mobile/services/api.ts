import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./tokenStorage";
import { userStorage } from "./userStorage";
import { RefreshQueue } from "./refreshQueue";
import { API_BASE_URL } from "../utils/constants";
import { RefreshResponse } from "../types";

type RetryableRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

const refreshQueue = new RefreshQueue();

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const setAuthHeader = (config: AxiosRequestConfig, token: string) => {
  const headers = (config.headers ?? {}) as Record<string, string>;
  headers.Authorization = `Bearer ${token}`;
  config.headers = headers;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    const headers = config.headers as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";
    const isAuthRoute = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");
    const isRefreshRoute = requestUrl.includes("/auth/refresh");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (isRefreshRoute || originalRequest._retry) {
      await tokenStorage.clear();
      await userStorage.clear();
      return Promise.reject(error);
    }

    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await tokenStorage.clear();
      await userStorage.clear();
      return Promise.reject(error);
    }

    if (refreshQueue.isRefreshing()) {
      return new Promise((resolve, reject) => {
        refreshQueue.enqueue((newToken) => {
          if (!newToken || !originalRequest) {
            reject(error);
            return;
          }
          setAuthHeader(originalRequest, newToken);
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    refreshQueue.startRefresh();

    try {
      const { data } = await refreshClient.post<RefreshResponse>("/auth/refresh", {
        refresh_token: refreshToken,
      });

      await tokenStorage.setAccessToken(data.access_token);
      if (data.refresh_token) {
        await tokenStorage.setRefreshToken(data.refresh_token);
      }
      refreshQueue.finishRefresh(data.access_token);
      setAuthHeader(originalRequest, data.access_token);
      return api(originalRequest);
    } catch (refreshError) {
      refreshQueue.finishRefresh(null);
      await tokenStorage.clear();
      await userStorage.clear();
      return Promise.reject(refreshError);
    }
  },
);
