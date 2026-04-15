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
      <Text style={styles.text}>Offline mode. Cached data only.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#9b1c1c",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
});
