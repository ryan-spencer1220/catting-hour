import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

type ThemedTextProps = TextProps & {
  type?: "title" | "subtitle" | "link" | "default";
};

export function ThemedText({ type = "default", style, children, ...rest }: ThemedTextProps) {
  const colorScheme = useColorScheme();

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        type === "title" && styles.title,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        colorScheme === "dark" && styles.darkText,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#111827",
  },
  darkText: {
    color: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
  },
  link: {
    color: "#2563eb",
    textDecorationLine: "underline",
  },
});
