import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function QuizAttemptScreen() {
  const params = useLocalSearchParams<{ quizId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quiz Attempt</Text>
      <Text style={styles.subtitle}>Quiz ID: {params.quizId ?? "-"}</Text>
      <Text style={styles.body}>Offline quiz-taking flow and local scoring will be added next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6fb",
    padding: 16,
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
  body: {
    color: "#415267",
  },
});
