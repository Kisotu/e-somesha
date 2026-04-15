import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import * as Network from "expo-network";
import { SyncContextValue } from "../types";

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const updateFromState = (state: Network.NetworkState) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    };

    const initialize = async () => {
      const state = await Network.getNetworkStateAsync();
      updateFromState(state);
    };

    void initialize();

    const subscription = Network.addNetworkStateListener((state) => {
      updateFromState(state);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo(
    () => ({ isOnline, lastSync, setLastSync }),
    [isOnline, lastSync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = (): SyncContextValue => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return context;
};
