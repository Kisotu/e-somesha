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
import { courseService } from "../../services/courseService";
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
    const data = await courseService.getCourses();
    setCourses(data);
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
        <Text style={styles.subtitle}>Local-first dashboard with server sync</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={courses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
    backgroundColor: "#f2f6fb",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#13233a",
  },
  subtitle: {
    color: "#4f6177",
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  empty: {
    textAlign: "center",
    color: "#4f6177",
    marginTop: 30,
  },
  error: {
    color: "#9b1c1c",
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
