import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats } from "@/lib/cats";
import { useRouter } from "expo-router";
import { Cat, PawPrint } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FadeImage } from "@/components/fade-image";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FeedScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const [cats, setCats] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetchingOpacity = useSharedValue(0);
  const fetchingStyle = useAnimatedStyle(() => ({ opacity: fetchingOpacity.value }));

  function animateFetchLabel(visible: boolean) {
    fetchingOpacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }

  async function loadCats(opts?: { refresh?: boolean }) {
    if (opts?.refresh) {
      setRefreshing(true);
      animateFetchLabel(true);
    }
    try {
      const rows = await fetchAllCats();
      setCats(rows);
    } catch {
      setCats([]);
    } finally {
      if (opts?.refresh) {
        animateFetchLabel(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    loadCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    try {
      return (cats || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }, [cats]);

  const card = dark ? "#1a2535" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#9ca3af" : "#6b7280";
  const tagBg = dark ? `${accent}22` : `${accent}18`;

  function renderItem({ item }: { item: any }) {
    const tags = [item.type, item.temperament].filter(Boolean);
    return (
      <Pressable
        style={[styles.card, { backgroundColor: card }]}
        onPress={() => router.push(`/cats/${item.id}`)}
      >
        {/* Hero image */}
        {item.image ? (
          <FadeImage uri={item.image} style={styles.hero} />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: dark ? "#2d3f55" : "#f3f4f6" }]}>
            <PawPrint size={40} color={dark ? "#4b5563" : "#d1d5db"} />
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, { color: textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>

          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag: string) => (
                <View key={tag} style={[styles.tag, { backgroundColor: tagBg }]}>
                  <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <Text style={[styles.addedBy, { color: textMuted }]} numberOfLines={1}>
              {item.ownerName ? `by ${item.ownerName}` : ""}
            </Text>
            <Text style={[styles.time, { color: textMuted }]}>
              {timeAgo(item.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dark ? "#0f1720" : "#f3f4f6" }]}>
      <Text style={[styles.heading, { color: textPrimary }]}>Recently Added</Text>
      <Animated.View style={[styles.fetchingLabel, fetchingStyle]}>
        <Cat size={13} color={textMuted} />
        <Text style={[styles.fetchingLabelText, { color: textMuted }]}>fetching cats...</Text>
      </Animated.View>
      {cats === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={dark ? "#fff" : "#111"} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadCats({ refresh: true })}
              tintColor={dark ? accent : "#111827"}
              colors={[accent]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  fetchingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  fetchingLabelText: { fontSize: 13, fontStyle: "italic" },
  list: { padding: 12, gap: 12 },

  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  hero: { width: "100%", height: 180 },
  heroPlaceholder: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  info: { padding: 14, gap: 8 },

  name: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },

  tags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: "600" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  addedBy: { fontSize: 12, flex: 1 },
  time: { fontSize: 12 },
});
