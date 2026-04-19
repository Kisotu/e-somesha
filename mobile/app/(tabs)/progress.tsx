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
      <Text style={styles.subtitle}>Overview of your offline and online activity</Text>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!metrics ? null : (
        <View style={styles.card}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Downloaded Courses</Text>
            <Text style={styles.metricValue}>
              {metrics.downloadedCourses}/{metrics.totalCourses} ({metrics.downloadCompletionPercent}%)
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cached Materials</Text>
            <Text style={styles.metricValue}>{metrics.totalMaterials}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Cached Announcements</Text>
            <Text style={styles.metricValue}>{metrics.totalAnnouncements}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Quiz Attempts</Text>
            <Text style={styles.metricValue}>{metrics.totalQuizAttempts}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Last Attempt</Text>
            <Text style={styles.metricValue}>
              {metrics.latestAttemptedAt ? new Date(metrics.latestAttemptedAt).toLocaleDateString() : "-"}
            </Text>
          </View>

          {pendingAttempts > 0 ? (
            <View style={styles.pendingContainer}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingAttempts} Pending Sync</Text>
              </View>
              <Text style={styles.pendingHint}>Will sync when online</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
    fontFamily: "System",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 16,
    marginBottom: 24,
    fontFamily: "System",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  metricLabel: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 14,
    fontFamily: "System",
  },
  metricValue: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "System",
  },
  pendingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fffbeb",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: "#fef3c7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    color: "#92400e",
    fontWeight: "600",
    fontSize: 12,
    fontFamily: "System",
  },
  pendingHint: {
    fontSize: 12,
    color: "#b45309",
    fontFamily: "System",
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontFamily: "System",
    fontWeight: "500",
  },
});
