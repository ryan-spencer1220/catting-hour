import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { SafeAreaView, StyleSheet, ViewProps } from "react-native";

export function ThemedView({ children, style, ...rest }: ViewProps) {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView {...rest} style={[styles.base, colorScheme === "dark" && styles.darkBg, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#fff",
  },
  darkBg: {
    backgroundColor: "#0f1720",
  },
});
