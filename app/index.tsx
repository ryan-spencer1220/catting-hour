import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const PURPLE = "#a78bfa";

export default function AuthLanding() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      <Text style={[styles.title, dark && styles.titleDark]}>Catting Hour</Text>
      <Text style={[styles.subtitle, dark && styles.subtitleDark]}>Share and discover local cats</Text>

      <Pressable style={[styles.button, dark && styles.buttonDark]} onPress={() => router.push("/login")}>
        <Text style={styles.buttonText}>Log in</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.outline, dark && styles.outlineDark]} onPress={() => router.push("/register")}>
        <Text style={[styles.outlineText, dark && styles.outlineTextDark]}>Create account</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  containerDark: { backgroundColor: "#0f1720" },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  titleDark: { color: "#fff" },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
    textAlign: "center",
  },
  subtitleDark: { color: "#9ca3af" },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 220,
    alignItems: "center",
  },
  buttonDark: { backgroundColor: PURPLE },
  buttonText: { color: "#fff", fontWeight: "600" },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#111827",
  },
  outlineDark: { borderColor: PURPLE },
  outlineText: { color: "#111827", fontWeight: "600" },
  outlineTextDark: { color: PURPLE },
});
