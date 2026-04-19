import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

export const DownloadButton = ({ label = "Download offline", onPress, disabled = false, icon }: Props) => {
  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.button, 
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed
      ]} 
      disabled={disabled}
    >
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={20} color="#ffffff" style={styles.icon} />}
        <Text style={styles.text}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    backgroundColor: "#475569",
    opacity: 0.7,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "System",
  },
});
