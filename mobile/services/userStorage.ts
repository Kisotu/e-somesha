import * as SecureStore from "expo-secure-store";
import { User } from "../types";
import { STORAGE_KEYS } from "../utils/constants";

export const userStorage = {
  async get(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.user);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async set(user: User): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.user);
  },
};
