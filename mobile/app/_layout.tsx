import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { SyncProvider } from "../context/SyncContext";
import { initializeDatabase } from "../database/init";

const RootNavigator = () => {
  const { isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading, router]);

  if (isLoading) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
};

export default function RootLayout() {
  const [dbBootstrapping, setDbBootstrapping] = useState(true);
  const [dbBootstrapError, setDbBootstrapError] = useState<string | null>(null);

  const bootstrapDatabase = async () => {
    setDbBootstrapping(true);
    setDbBootstrapError(null);

    try {
      await initializeDatabase();
    } catch {
      setDbBootstrapError(
        "Offline database failed to initialize. Retry to continue or restart the app.",
      );
    } finally {
      setDbBootstrapping(false);
    }
  };

  useEffect(() => {
    void bootstrapDatabase();
  }, []);

  if (dbBootstrapping) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#0f4c81" />
        <Text style={styles.title}>Preparing offline data</Text>
        <Text style={styles.subtitle}>Setting up local storage for your learning content.</Text>
      </View>
    );
  }

  if (dbBootstrapError) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorTitle}>Could not start local database</Text>
        <Text style={styles.errorText}>{dbBootstrapError}</Text>
        <Pressable style={styles.retryButton} onPress={() => void bootstrapDatabase()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AuthProvider>
      <SyncProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SyncProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    backgroundColor: "#f5f8fb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#13233a",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#4f6177",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#9b1c1c",
    textAlign: "center",
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4f6177",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#0f4c81",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
