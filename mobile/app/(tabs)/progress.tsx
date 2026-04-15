import { StyleSheet, Text, View } from "react-native";

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Progress metrics will be wired to local SQLite sync data.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6fb",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#13233a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#4f6177",
  },
});
