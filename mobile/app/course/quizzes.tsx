import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { offlineData } from "../../database/offlineData";
import { courseService } from "../../services/courseService";
import { withRetry } from "../../services/retry";
import { Quiz } from "../../types";

export default function QuizzesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const courseId = useMemo(() => {
    const raw = params.id;
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

  useEffect(() => {
    const run = async () => {
      if (!courseId) {
        setError("Invalid course id.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const data = await withRetry(() => courseService.getCourseQuizzes(courseId));
        setQuizzes(data);
        await offlineData.upsertQuizzes(data);
      } catch {
        const offlineQuizzes = await offlineData.getCourseQuizzes(courseId);
        if (offlineQuizzes.length > 0) {
          setQuizzes(offlineQuizzes);
          setError("Showing offline quizzes. Connect to refresh.");
        } else {
          setError("Unable to load quizzes.");
        }
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [courseId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f172a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quizzes</Text>
        <Text style={styles.subtitle}>Assessments for Course {params.id ?? "-"}</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={quizzes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable 
            style={({ pressed }) => [styles.quizCard, pressed && styles.quizCardPressed]} 
            onPress={() => router.push(`/course/quiz/${item.id}`)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle-outline" size={24} color="#0f172a" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.quizTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.quizMeta}>
                {item.question_count ?? 0} questions {item.time_limit_minutes ? ` • ${item.time_limit_minutes} min` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="documents-outline" size={48} color="#cbd5e1" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No quizzes available yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
    fontFamily: "System",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 16,
    fontFamily: "System",
  },
  listContent: {
    padding: 24,
  },
  quizCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quizCardPressed: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  iconContainer: {
    backgroundColor: "#f8fafc",
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  quizTitle: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
    fontFamily: "System",
  },
  quizMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "System",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    fontFamily: "System",
    textAlign: "center",
  },
  errorContainer: {
    margin: 24,
    marginBottom: 0,
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
