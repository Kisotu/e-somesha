import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { validateLoginInput } from "../../utils/validation";

export default function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const visibleError = error ?? authError;

  const onSubmit = async () => {
    setError(null);
    const validationError = validateLoginInput(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to access your courses offline and online.</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
      />

      {visibleError ? <Text style={styles.error}>{visibleError}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
      </Pressable>

      <Link href="/(auth)/register" style={styles.link}>
        Need an account? Register
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f8fb",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#13233a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#4f6177",
    marginBottom: 18,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d7e1ec",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#0f4c81",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    color: "#9b1c1c",
    marginTop: 4,
  },
  link: {
    marginTop: 14,
    color: "#0f4c81",
    textAlign: "center",
    fontWeight: "600",
  },
});
