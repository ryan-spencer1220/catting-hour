import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  icon: React.ReactElement;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, body, cta }: Props) {
  const dark = useColorScheme() === "dark";
  const accent = useAccent();
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#9ca3af" : "#6b7280";

  return (
    <View style={styles.container}>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.iconWrap, { backgroundColor: dark ? `${accent}25` : `${accent}18` }]}>
        {icon}
      </View>
      <Text style={[styles.title, { color: textPrimary }]} accessibilityRole="header">
        {title}
      </Text>
      {body ? <Text style={[styles.body, { color: textMuted }]}>{body}</Text> : null}
      {cta ? (
        <Pressable
          style={[styles.cta, { backgroundColor: accent }]}
          onPress={cta.onPress}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 60,
    gap: 12,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center", letterSpacing: -0.3 },
  body: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  cta: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
