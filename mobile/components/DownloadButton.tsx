import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
};

export const DownloadButton = ({ label = "Download offline", onPress, disabled = false }: Props) => {
  return (
    <Pressable onPress={onPress} style={[styles.button, disabled ? styles.buttonDisabled : null]} disabled={disabled}>
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
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
