import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quizzes</Text>
      <Text style={styles.subtitle}>Course ID: {params.id ?? "-"}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={quizzes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.quizCard} onPress={() => router.push(`/course/quiz/${item.id}`)}>
            <Text style={styles.quizTitle}>{item.title}</Text>
            <Text style={styles.quizMeta}>
              {item.question_count ?? 0} questions {item.time_limit_minutes ? `• ${item.time_limit_minutes} min` : ""}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No quizzes available for this course.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6fb",
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#13233a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#4f6177",
    marginBottom: 12,
  },
  quizCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dde3ea",
    padding: 14,
    marginBottom: 10,
  },
  quizTitle: {
    color: "#13233a",
    fontWeight: "700",
  },
  quizMeta: {
    color: "#4f6177",
    marginTop: 4,
  },
  empty: {
    textAlign: "center",
    color: "#4f6177",
    marginTop: 24,
  },
  error: {
    color: "#9b1c1c",
    marginBottom: 8,
  },
});
