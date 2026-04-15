import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { DownloadButton } from "../../components/DownloadButton";

export default function CourseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course {params.id}</Text>
      <Text style={styles.subtitle}>Course detail and offline package actions.</Text>

      <View style={styles.actions}>
        <DownloadButton onPress={() => {}} />
      </View>

      <Text style={styles.link} onPress={() => router.push(`/course/materials?id=${params.id}`)}>
        View materials
      </Text>
      <Text style={styles.link} onPress={() => router.push(`/course/quizzes?id=${params.id}`)}>
        View quizzes
      </Text>
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
  },
  subtitle: {
    color: "#4f6177",
    marginTop: 4,
    marginBottom: 16,
  },
  actions: {
    marginBottom: 16,
  },
  link: {
    color: "#0f4c81",
    fontWeight: "700",
    marginBottom: 10,
  },
});
