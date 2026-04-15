import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Network from "expo-network";
import { useAuth } from "./AuthContext";
import { offlineData } from "../database/offlineData";
import { courseService } from "../services/courseService";
import { SyncContextValue } from "../types";

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const isSyncingPendingAttemptsRef = useRef(false);

  useEffect(() => {
    const flushPendingQuizAttempts = async () => {
      if (!isOnline || !user || isSyncingPendingAttemptsRef.current) {
        return;
      }

      isSyncingPendingAttemptsRef.current = true;

      try {
        const pendingAttempts = await offlineData.getPendingQuizAttempts(user.id);
        if (pendingAttempts.length === 0) {
          return;
        }

        await courseService.syncQuizAttempts(
          pendingAttempts.map((attempt) => ({
            user_id: attempt.userId,
            quiz_id: attempt.quizId,
            answers: attempt.answers,
            score: attempt.score,
            attempted_at: attempt.attemptedAt,
          })),
        );

        await offlineData.markQuizAttemptsSynced(pendingAttempts.map((attempt) => attempt.queueId));
        setLastSync(new Date().toISOString());
      } catch {
        // Keep queued attempts for the next reconnect event.
      } finally {
        isSyncingPendingAttemptsRef.current = false;
      }
    };

    void flushPendingQuizAttempts();
  }, [isOnline, user]);

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
