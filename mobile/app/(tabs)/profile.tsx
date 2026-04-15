import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { user, signOut, authError } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name ?? "-"}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? "-"}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role ?? "-"}</Text>
      </View>

      {authError ? <Text style={styles.warning}>{authError}</Text> : null}

      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dde3ea",
    padding: 14,
  },
  label: {
    color: "#5d6f83",
    fontWeight: "600",
    marginTop: 10,
  },
  value: {
    color: "#13233a",
    fontWeight: "700",
    marginTop: 2,
  },
  warning: {
    marginTop: 12,
    color: "#9b1c1c",
    fontWeight: "600",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#9b1c1c",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
