import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label?: string;
  onPress: () => void;
};

export const DownloadButton = ({ label = "Download offline", onPress }: Props) => {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0f4c81",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
