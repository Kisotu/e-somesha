import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
};

export const OfflineBanner = ({ visible }: Props) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={16} color="#f8fafc" style={styles.icon} />
      <Text style={styles.text}>You are offline. Viewing cached data.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#f8fafc",
    fontWeight: "500",
    textAlign: "center",
    fontSize: 14,
    fontFamily: "System",
  },
});
