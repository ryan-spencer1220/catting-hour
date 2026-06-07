import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
