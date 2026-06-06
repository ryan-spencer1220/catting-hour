import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";

export default function RecentlyScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  return (
    <SafeAreaView style={[styles.container, dark && styles.darkBg]}>
      <Text style={[styles.heading, dark && styles.darkText]}>Recently</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  darkBg: { backgroundColor: "#0f1720" },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827", paddingHorizontal: 16, paddingTop: 16 },
  darkText: { color: "#fff" },
});
