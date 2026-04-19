import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { offlineData } from "../../database/offlineData";
import { courseService } from "../../services/courseService";
import { withRetry } from "../../services/retry";
import { Material } from "../../types";

export default function MaterialsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);

  const courseId = useMemo(() => {
    if (!params.id) {
      return null;
    }

    const parsed = Number(params.id);
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
        const data = await withRetry(() => courseService.getCourseMaterials(courseId));
        setMaterials(data);
        await offlineData.upsertMaterials(data);
      } catch {
        const localMaterials = await offlineData.getCourseMaterials(courseId);
        if (localMaterials.length > 0) {
          setMaterials(localMaterials);
          setError("Showing offline materials. Connect to refresh.");
        } else {
          setError("Unable to load materials.");
        }
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [courseId]);

  const openMaterial = async (fileUrl: string) => {
    if (!fileUrl) {
      return;
    }

    try {
      await Linking.openURL(fileUrl);
    } catch {
      setError("Unable to open this material link.");
    }
  };

  const getIconForType = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('pdf')) return 'document-text-outline';
    if (t.includes('video') || t.includes('mp4')) return 'videocam-outline';
    if (t.includes('audio') || t.includes('mp3')) return 'musical-notes-outline';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return 'image-outline';
    return 'document-outline';
  };

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
        <Text style={styles.title}>Materials</Text>
        <Text style={styles.subtitle}>Resources for Course {params.id ?? "-"}</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={materials}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} 
            onPress={() => void openMaterial(item.file_url)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={getIconForType(item.type)} size={24} color="#0f172a" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.type.toUpperCase()}</Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#94a3b8" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No materials available yet.</Text>
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
  card: {
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
  cardPressed: {
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
  cardTitle: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 4,
    fontFamily: "System",
  },
  cardMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "System",
    letterSpacing: 0.5,
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
