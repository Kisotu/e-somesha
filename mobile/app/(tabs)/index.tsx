import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CourseCard } from "../../components/CourseCard";
import { OfflineBanner } from "../../components/OfflineBanner";
import { useSync } from "../../context/SyncContext";
import { offlineData } from "../../database/offlineData";
import { courseService } from "../../services/courseService";
import { withRetry } from "../../services/retry";
import { Course } from "../../types";

export default function DashboardScreen() {
  const router = useRouter();
  const { isOnline } = useSync();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    setError(null);
    const data = await withRetry(() => courseService.getCourses());
    setCourses(data);
    await offlineData.upsertCourses(data);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchCourses();
      } catch {
        setError("Unable to load courses.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCourses();
    } catch {
      setError("Unable to refresh courses.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner visible={!isOnline} />
      <View style={styles.header}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={styles.subtitle}>Welcome back to your learning dashboard</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={courses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
        renderItem={({ item }) => (
          <CourseCard course={item} onPress={() => router.push(`/course/${item.id}`)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No enrolled courses yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "System",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 6,
    fontFamily: "System",
    fontWeight: "400",
  },
  listContent: {
    padding: 20,
    paddingTop: 12,
  },
  empty: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 15,
    marginTop: 40,
    fontFamily: "System",
  },
  errorContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontFamily: "System",
    fontWeight: "500",
  },
});
