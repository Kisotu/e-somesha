import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function MaterialsScreen() {
  const params = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Materials</Text>
      <Text style={styles.subtitle}>Course ID: {params.id ?? "-"}</Text>
      <Text style={styles.body}>Materials listing and viewer integration will be added next.</Text>
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
