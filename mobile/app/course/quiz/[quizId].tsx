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
      <Text style={styles.title}>Quiz Attempt</Text>
      <Text style={styles.subtitle}>Quiz ID: {params.quizId ?? "-"}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!detail ? (
        <Text style={styles.body}>Quiz details are unavailable.</Text>
      ) : (
        <>
          <Text style={styles.quizTitle}>{detail.quiz.title}</Text>
          <FlatList
            data={detail.questions}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{index + 1}. {item.question_text}</Text>
                {item.options.map((option, optionIndex) => {
                  const selected = answers[item.id] === optionIndex;
                  return (
                    <Pressable
                      key={`${item.id}-${optionIndex}`}
                      onPress={() => setAnswer(item.id, optionIndex)}
                      style={[styles.optionButton, selected ? styles.optionButtonSelected : null]}
                    >
                      <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            ListFooterComponent={
              <Pressable style={styles.submitButton} onPress={() => void submitAttempt()}>
                <Text style={styles.submitButtonText}>Submit attempt</Text>
              </Pressable>
            }
          />
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </>
      )}
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
  quizTitle: {
    color: "#13233a",
    fontWeight: "700",
    marginBottom: 10,
  },
  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dde3ea",
    padding: 14,
    marginBottom: 10,
  },
  questionText: {
    color: "#13233a",
    fontWeight: "600",
    marginBottom: 10,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#cfd9e4",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#f7f9fc",
  },
  optionButtonSelected: {
    borderColor: "#0f4c81",
    backgroundColor: "#e9f2fb",
  },
  optionText: {
    color: "#33475b",
  },
  optionTextSelected: {
    color: "#0f4c81",
    fontWeight: "700",
  },
  submitButton: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: "#0f4c81",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  body: {
    color: "#415267",
  },
  error: {
    color: "#9b1c1c",
    marginBottom: 8,
  },
  status: {
    color: "#1f5130",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 10,
  },
});
