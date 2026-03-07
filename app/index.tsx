import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AuthLanding() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  return (
    <View style={[styles.container, colorScheme === "dark" && styles.containerDark]}>
      <Text style={styles.title}>Catting Hour</Text>
      <Text style={styles.subtitle}>Share and discover local cats</Text>

      <Pressable style={styles.button} onPress={() => router.push("/login")}>
        <Text style={styles.buttonText}>Log in</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.outline]} onPress={() => router.push("/register")}>
        <Text style={[styles.buttonText, styles.outlineText]}>Create account</Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/map")}>
        <Text style={styles.guest}>Continue as guest</Text>
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
  containerDark: {
    backgroundColor: "#0f1720",
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 220,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#111827",
  },
  outlineText: {
    color: "#111827",
  },
  guest: {
    marginTop: 18,
    color: "#2563eb",
  },
});
