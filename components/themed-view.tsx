import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";

export function ThemedView({ children, style, ...rest }: ViewProps) {
  const colorScheme = useColorScheme();

  return (
    <View {...rest} style={[styles.base, colorScheme === "dark" && styles.darkBg, style]}>
      {children}
    </View>
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
