import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, fetchFollowingCats } from "@/lib/cats";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { Cat, PawPrint, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
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

type Filter = "all" | "following";

export default function FeedScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const [filter, setFilter] = useState<Filter>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cats, setCats] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetchingOpacity = useSharedValue(0);
  const fetchingStyle = useAnimatedStyle(() => ({ opacity: fetchingOpacity.value }));

  function animateFetchLabel(visible: boolean) {
    fetchingOpacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }

  // Resolve current user once
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, []);

  async function loadCats(opts?: { refresh?: boolean }) {
    if (opts?.refresh) {
      setRefreshing(true);
      animateFetchLabel(true);
    } else {
      setCats(null);
    }
    try {
      let rows: any[];
      if (filter === "following" && currentUserId) {
        rows = await fetchFollowingCats(currentUserId);
      } else if (filter === "following") {
        rows = [];
      } else {
        rows = await fetchAllCats();
      }
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

  useFocusEffect(
    useCallback(() => {
      loadCats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, currentUserId])
  );

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
  const toggleBg = dark ? "#1a2535" : "#e5e7eb";
  const toggleActiveBg = accent;
  const toggleActiveText = "#fff";
  const toggleInactiveText = dark ? "#9ca3af" : "#6b7280";

  function renderItem({ item }: { item: any }) {
    const tags = [item.type, item.temperament].filter(Boolean);
    return (
      <Pressable
        style={[styles.card, { backgroundColor: card }]}
        onPress={() => router.push(`/cats/${item.id}`)}
      >
        {item.image ? (
          <FadeImage uri={item.image} style={styles.hero} />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: dark ? "#2d3f55" : "#f3f4f6" }]}>
            <PawPrint size={40} color={dark ? "#4b5563" : "#d1d5db"} />
          </View>
        )}
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

  function renderEmpty() {
    if (cats === null) return null;
    if (filter === "following" && !currentUserId) {
      return (
        <EmptyState
          icon={<Users size={36} color={accent} />}
          title="Sign in to see your feed"
          body="Follow cat lovers to see their latest sightings right here."
          cta={{ label: "Sign in", onPress: () => router.push("/(auth)/login") }}
        />
      );
    }
    if (filter === "following") {
      return (
        <EmptyState
          icon={<Users size={36} color={accent} />}
          title="Your feed is a little lonely"
          body="Follow some cat lovers and their latest finds will show up here."
        />
      );
    }
    return (
      <EmptyState
        icon={<Cat size={36} color={accent} />}
        title="The streets are quiet"
        body="No cats have been spotted yet. Be the first to put one on the map!"
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dark ? "#0f1720" : "#f3f4f6" }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.iconRing, { backgroundColor: dark ? `${accent}25` : `${accent}18` }]}>
            <Cat size={22} color={accent} />
          </View>
          <Text style={[styles.heading, { color: textPrimary }]}>Feed</Text>
        </View>
        <Animated.View style={[styles.fetchingLabel, fetchingStyle]}>
          <Text style={[styles.fetchingLabelText, { color: textMuted }]}>fetching cats…</Text>
        </Animated.View>
      </View>

      {/* Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: toggleBg }]}>
        {(["all", "following"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.toggleBtn, filter === f && { backgroundColor: toggleActiveBg }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.toggleText, { color: filter === f ? toggleActiveText : toggleInactiveText }]}>
              {f === "all" ? "All" : "Following"}
            </Text>
          </Pressable>
        ))}
      </View>

      {cats === null ? (
        <FeedSkeleton card={card} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, sorted.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
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

function FeedSkeleton({ card }: { card: string }) {
  return (
    <View style={{ padding: 12, gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[feedSkeletonStyles.card, { backgroundColor: card }]}>
          <Skeleton style={{ width: "100%", height: 180 }} radius={0} />
          <View style={feedSkeletonStyles.info}>
            <Skeleton style={{ height: 20, width: "55%" }} />
            <Skeleton style={{ height: 18, width: "32%", borderRadius: 999 }} />
            <View style={feedSkeletonStyles.footer}>
              <Skeleton style={{ height: 13, width: "22%" }} />
              <Skeleton style={{ height: 13, width: "14%" }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const feedSkeletonStyles = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden" },
  info: { padding: 14, gap: 10 },
  footer: { flexDirection: "row", justifyContent: "space-between" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  fetchingLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  fetchingLabelText: { fontSize: 12, fontStyle: "italic" },

  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleText: { fontSize: 14, fontWeight: "600" },

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
