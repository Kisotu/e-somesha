import { Pressable, StyleSheet, Text, View } from "react-native";
import { Course } from "../types";

type Props = {
  course: Course;
  onPress: () => void;
};

export const CourseCard = ({ course, onPress }: Props) => {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.code}>{course.code}</Text>
      </View>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {course.description}
      </Text>
      {course.lecturer_name ? <Text style={styles.meta}>Lecturer: {course.lecturer_name}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dde3ea",
  },
  headerRow: {
    marginBottom: 6,
  },
  code: {
    color: "#0f4c81",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#13233a",
    marginBottom: 6,
  },
  description: {
    color: "#415267",
    marginBottom: 8,
  },
  meta: {
    color: "#5d6f83",
    fontSize: 12,
    fontWeight: "600",
  },
});
