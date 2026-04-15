import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { DownloadButton } from "../../components/DownloadButton";
import { offlineData } from "../../database/offlineData";
import { courseService } from "../../services/courseService";
import { withRetry } from "../../services/retry";
import { Material } from "../../types";

export default function CourseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const courseId = useMemo(() => {
    if (!params.id) {
      return null;
    }
    const parsed = Number(params.id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

  const handleDownload = async () => {
    if (!courseId) {
      setStatus("Invalid course id.");
      return;
    }

    setDownloading(true);
    setStatus(null);

    try {
      const [manifest, courses] = await Promise.all([
        withRetry(() => courseService.getDownloadManifest(courseId)),
        withRetry(() => courseService.getCourses()),
      ]);

      const selectedCourse = courses.find((course) => course.id === courseId);
      if (selectedCourse) {
        await offlineData.upsertCourses([selectedCourse]);
      }

      const manifestMaterials: Material[] = manifest.files.map((file) => ({
        id: file.material_id,
        course_id: manifest.course_id,
        title: file.title,
        type: file.type,
        file_url: file.url,
        file_size: file.file_size,
        checksum: file.checksum,
        updated_at: new Date().toISOString(),
      }));

      await Promise.all([
        offlineData.upsertMaterials(manifestMaterials),
        offlineData.upsertQuizzes(manifest.quizzes),
        offlineData.upsertAnnouncements(manifest.announcements),
      ]);

      await offlineData.markCourseDownloaded(courseId, manifestMaterials.length);
      setStatus("Course content cached for offline access.");
    } catch {
      setStatus("Unable to download offline package.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course {params.id}</Text>
      <Text style={styles.subtitle}>Course detail and offline package actions.</Text>

      <View style={styles.actions}>
        <DownloadButton
          onPress={() => void handleDownload()}
          label={downloading ? "Downloading..." : "Download offline"}
          disabled={downloading}
        />
      </View>

      {downloading ? <ActivityIndicator style={styles.loader} /> : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}

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
  loader: {
    marginBottom: 8,
  },
  status: {
    color: "#1f5130",
    fontWeight: "600",
    marginBottom: 12,
  },
  link: {
    color: "#0f4c81",
    fontWeight: "700",
    marginBottom: 10,
  },
});
