import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "../utils/constants";

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.accessToken);
  },

  async setAccessToken(value: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, value);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);
  },

  async setRefreshToken(value: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, value);
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken);
  },
};
