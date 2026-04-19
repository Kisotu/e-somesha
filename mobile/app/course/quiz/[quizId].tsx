import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { useSync } from "../../../context/SyncContext";
import { offlineData } from "../../../database/offlineData";
import { courseService } from "../../../services/courseService";
import { withRetry } from "../../../services/retry";
import { QuizDetailResponse } from "../../../types";

export default function QuizAttemptScreen() {
  const params = useLocalSearchParams<{ quizId: string }>();
  const { user } = useAuth();
  const { isOnline, setLastSync } = useSync();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuizDetailResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const quizId = useMemo(() => {
    if (!params.quizId) {
      return null;
    }

    const parsed = Number(params.quizId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.quizId]);

  useEffect(() => {
    const run = async () => {
      if (!quizId) {
        setError("Invalid quiz id.");
        setLoading(false);
        return;
      }

      try {
        const data = await withRetry(() => courseService.getQuiz(quizId));
        setDetail(data);
      } catch {
        setError("Unable to load quiz details.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [quizId]);

  const setAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const submitAttempt = async () => {
    if (!detail || !user) {
      return;
    }

    const orderedAnswers = detail.questions.map((question) => answers[question.id] ?? -1);
    const answeredCount = orderedAnswers.filter((value) => value >= 0).length;

    if (answeredCount !== detail.questions.length) {
      setError("Answer all questions before submitting.");
      return;
    }

    const score = answeredCount;
    const attemptedAt = new Date().toISOString();

    setError(null);
    setStatus(null);

    try {
      await offlineData.saveQuizAttempt(
        user.id,
        detail.quiz.id,
        detail.quiz.course_id,
        orderedAnswers,
        score,
        attemptedAt,
      );

      if (isOnline) {
        const pendingAttempts = await offlineData.getPendingQuizAttempts(user.id);
        const latestPending = pendingAttempts.find(
          (attempt) =>
            attempt.quizId === detail.quiz.id &&
            attempt.attemptedAt === attemptedAt,
        );

        await courseService.syncQuizAttempts([
          {
            user_id: user.id,
            quiz_id: detail.quiz.id,
            answers: orderedAnswers,
            score,
            attempted_at: attemptedAt,
          },
        ]);

        if (latestPending) {
          await offlineData.markQuizAttemptsSynced([latestPending.queueId]);
        }

        setLastSync(attemptedAt);
        setStatus("Quiz submitted and synced.");
      } else {
        setStatus("Quiz saved offline. It will sync once you reconnect.");
      }
    } catch {
      setStatus("Quiz saved locally but sync failed. It will retry when online.");
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quiz</Text>
        <Text style={styles.headerSubtitle}>Assessment ID: {params.quizId ?? "-"}</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!detail ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Quiz details are unavailable.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={detail.questions}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>Title: {detail.quiz.title}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{index + 1}. {item.question_text}</Text>
              {item.options.map((option, optionIndex) => {
                const selected = answers[item.id] === optionIndex;
                return (
                  <Pressable
                    key={`${item.id}-${optionIndex}`}
                    onPress={() => setAnswer(item.id, optionIndex)}
                    style={({ pressed }) => [
                      styles.optionButton, 
                      selected && styles.optionButtonSelected,
                      pressed && !selected && styles.optionButtonPressed
                    ]}
                  >
                    <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
                      {selected && <View style={styles.optionRadioInner} />}
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          ListFooterComponent={
            <>
              <Pressable style={styles.submitButton} onPress={() => void submitAttempt()}>
                <Text style={styles.submitButtonText}>Submit Attempt</Text>
              </Pressable>
              {status ? (
                <View style={styles.statusContainer}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              ) : null}
            </>
          }
        />
      )}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
    fontFamily: "System",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 16,
    fontFamily: "System",
  },
  listContent: {
    padding: 24,
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
    fontFamily: "System",
    lineHeight: 26,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonPressed: {
    backgroundColor: "#f1f5f9",
  },
  optionButtonSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#22c55e",
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  optionRadioSelected: {
    borderColor: "#22c55e",
    backgroundColor: "#ffffff",
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  optionText: {
    color: "#334155",
    fontSize: 16,
    fontFamily: "System",
    flex: 1,
  },
  optionTextSelected: {
    color: "#166534",
    fontWeight: "600",
  },
  submitButton: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "System",
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
  statusContainer: {
    marginTop: 16,
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  statusText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "System",
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    fontFamily: "System",
    textAlign: "center",
  },
});
