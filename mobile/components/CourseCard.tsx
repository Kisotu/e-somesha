import { Pressable, StyleSheet, Text, View } from "react-native";
import { Course } from "../types";

type Props = {
  course: Course;
  onPress: () => void;
};

export const CourseCard = ({ course, onPress }: Props) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.code}>{course.code}</Text>
        </View>
      </View>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {course.description || "No description provided."}
      </Text>
      {course.lecturer_name ? (
        <View style={styles.metaContainer}>
          <Text style={styles.metaLabel}>Instructor</Text>
          <Text style={styles.metaValue}>{course.lecturer_name}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPressed: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  code: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 12,
    fontFamily: "System",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    fontFamily: "System",
    letterSpacing: -0.3,
  },
  description: {
    color: "#64748b",
    marginBottom: 14,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "System",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  metaLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
    marginRight: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
});
