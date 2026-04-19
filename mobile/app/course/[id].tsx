import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Course {params.id}</Text>
        </View>
        <Text style={styles.title}>Overview</Text>
        <Text style={styles.subtitle}>Access materials, quizzes, and download content for offline use.</Text>
      </View>

      <View style={styles.actions}>
        <DownloadButton
          onPress={() => void handleDownload()}
          label={downloading ? "Downloading..." : "Download Course"}
          disabled={downloading}
          icon={downloading ? undefined : "cloud-download-outline"}
        />
      </View>

      {downloading ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator color="#0f172a" style={styles.loader} />
          <Text style={styles.statusText}>Syncing content...</Text>
        </View>
      ) : null}

      {status && !downloading ? (
        <View style={styles.statusContainerSuccess}>
          <Ionicons name="checkmark-circle" size={20} color="#166534" />
          <Text style={styles.statusTextSuccess}>{status}</Text>
        </View>
      ) : null}

      <View style={styles.linksContainer}>
        <Pressable 
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
          onPress={() => router.push(`/course/materials?id=${params.id}`)}
        >
          <View style={styles.linkIconContainer}>
            <Ionicons name="document-text-outline" size={24} color="#0f172a" />
          </View>
          <View style={styles.linkTextContainer}>
            <Text style={styles.linkTitle}>Materials</Text>
            <Text style={styles.linkSubtitle}>Documents, slides, and files</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </Pressable>

        <Pressable 
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
          onPress={() => router.push(`/course/quizzes?id=${params.id}`)}
        >
          <View style={styles.linkIconContainer}>
            <Ionicons name="help-circle-outline" size={24} color="#0f172a" />
          </View>
          <View style={styles.linkTextContainer}>
            <Text style={styles.linkTitle}>Quizzes</Text>
            <Text style={styles.linkSubtitle}>Test your knowledge</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  badgeText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
    fontFamily: "System",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    fontFamily: "System",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 16,
    fontFamily: "System",
    lineHeight: 24,
  },
  actions: {
    marginBottom: 24,
  },
  loader: {
    marginRight: 10,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  statusText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "System",
  },
  statusContainerSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
    marginBottom: 24,
  },
  statusTextSuccess: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "System",
    marginLeft: 8,
  },
  linksContainer: {
    gap: 12,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  linkCardPressed: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  linkIconContainer: {
    backgroundColor: "#f1f5f9",
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
    fontFamily: "System",
  },
  linkSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "System",
  },
});
