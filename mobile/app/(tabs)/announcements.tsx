import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { announcementService } from "../../services/announcementService";
import { courseService } from "../../services/courseService";
import { Announcement } from "../../types";

export default function AnnouncementsScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const courses = await courseService.getCourses();
        if (courses.length === 0) {
          setItems([]);
          return;
        }

        const firstCourse = courses[0];
        const data = await announcementService.getCourseAnnouncements(firstCourse.id);
        setItems(data);
      } catch {
        setError("Unable to load announcements.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Announcements</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardContent}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No announcements available.</Text>}
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#dde3ea",
  },
  cardTitle: {
    fontWeight: "700",
    color: "#13233a",
    marginBottom: 6,
  },
  cardContent: {
    color: "#415267",
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
