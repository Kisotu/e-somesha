import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { user, signOut, authError } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name ?? "-"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? "-"}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{user?.role ?? "-"}</Text>
        </View>
      </View>

      {authError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{authError}</Text>
        </View>
      ) : null}

      <Pressable 
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} 
        onPress={() => void signOut()}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
    fontFamily: "System",
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fieldContainer: {
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  label: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 13,
    marginBottom: 4,
    fontFamily: "System",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "System",
  },
  errorContainer: {
    marginTop: 20,
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
  button: {
    marginTop: 24,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonPressed: {
    backgroundColor: "#f1f5f9",
  },
  buttonText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "System",
  },
});
