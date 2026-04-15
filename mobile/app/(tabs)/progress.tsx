import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { ProgressMetrics, offlineData } from "../../database/offlineData";

export default function ProgressScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ProgressMetrics | null>(null);
  const [pendingAttempts, setPendingAttempts] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        setError(null);
        const data = await offlineData.getProgressMetrics();
        setMetrics(data);
        if (user) {
          const pendingCount = await offlineData.getPendingQuizAttemptCount(user.id);
          setPendingAttempts(pendingCount);
        } else {
          setPendingAttempts(0);
        }
      } catch {
        setError("Unable to load progress metrics.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!metrics ? null : (
        <View style={styles.card}>
          <Text style={styles.metricLabel}>Downloaded courses</Text>
          <Text style={styles.metricValue}>
            {metrics.downloadedCourses}/{metrics.totalCourses} ({metrics.downloadCompletionPercent}%)
          </Text>

          <Text style={styles.metricLabel}>Cached materials</Text>
          <Text style={styles.metricValue}>{metrics.totalMaterials}</Text>

          <Text style={styles.metricLabel}>Cached announcements</Text>
          <Text style={styles.metricValue}>{metrics.totalAnnouncements}</Text>

          <Text style={styles.metricLabel}>Quiz attempts</Text>
          <Text style={styles.metricValue}>{metrics.totalQuizAttempts}</Text>

          {pendingAttempts > 0 ? (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingAttempts} pending offline sync</Text>
            </View>
          ) : null}

          <Text style={styles.metricLabel}>Last quiz attempt</Text>
          <Text style={styles.metricValue}>{metrics.latestAttemptedAt ?? "-"}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f6fb",
    padding: 20,
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
    marginBottom: 8,
  },
  subtitle: {
    color: "#4f6177",
  },
  card: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dde3ea",
    padding: 14,
  },
  metricLabel: {
    color: "#5d6f83",
    marginTop: 10,
    fontWeight: "600",
  },
  metricValue: {
    color: "#13233a",
    fontWeight: "700",
    marginTop: 2,
  },
  pendingBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#fff4d7",
    borderWidth: 1,
    borderColor: "#e8d18a",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    color: "#6b4e00",
    fontWeight: "700",
    fontSize: 12,
  },
  error: {
    color: "#9b1c1c",
    marginTop: 8,
  },
});
