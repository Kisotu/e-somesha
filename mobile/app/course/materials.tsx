import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Materials</Text>
      <Text style={styles.subtitle}>Course ID: {params.id ?? "-"}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={materials}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => void openMaterial(item.file_url)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.type.toUpperCase()}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.body}>No materials available for this course.</Text>}
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dde3ea",
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    color: "#13233a",
    fontWeight: "700",
  },
  cardMeta: {
    color: "#4f6177",
    marginTop: 4,
  },
  body: {
    color: "#415267",
    textAlign: "center",
    marginTop: 24,
  },
  error: {
    color: "#9b1c1c",
    marginBottom: 8,
  },
});
