import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { ChevronLeft, PawPrint } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FadeImage } from "@/components/fade-image";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";

const GRID_H_PAD = 12;
const GRID_GAP = 8;

export default function MyLoggedCatsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const bg = dark ? "#0f1720" : "#f5f5f7";
  const card = dark ? "#1a2535" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#6b7280" : "#9ca3af";

  const cardWidth = (screenWidth - GRID_H_PAD * 2 - GRID_GAP) / 2;

  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      if (!userId) { if (mounted) setLoading(false); return; }

      const all = await fetchAllCats();
      if (mounted) {
        setCats(all.filter((c) => c.owner === userId));
        setLoading(false);
      }
    }

    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: bg }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={textPrimary} />
        </Pressable>
        <View
          style={[styles.iconRing, { backgroundColor: dark ? `${accent}25` : `${accent}18` }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <PawPrint size={20} color={accent} />
        </View>
        <Text style={[styles.title, { color: textPrimary }]} accessibilityRole="header">My Cats</Text>
      </View>

      {loading ? (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ width: cardWidth, height: cardWidth * 0.85 + 50, borderRadius: 12 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(c) => c.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: GRID_H_PAD, gap: GRID_GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon={<PawPrint size={36} color={accent} />}
              title="No cats logged yet"
              body="Head outside and be the first to spot one!"
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.gridCard, { backgroundColor: card, width: cardWidth }]}
              onPress={() => router.push(`/cats/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityHint="Opens cat details"
            >
              {item.image ? (
                <FadeImage
                  uri={item.image}
                  style={{ width: cardWidth, height: cardWidth * 0.85, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                />
              ) : (
                <View style={[styles.gridPlaceholder, { width: cardWidth, height: cardWidth * 0.85, backgroundColor: dark ? "#2d3f55" : "#e5e7eb" }]}>
                  <PawPrint size={28} color={dark ? "#6b7280" : "#9ca3af"} />
                </View>
              )}
              <View style={styles.gridInfo}>
                <Text style={[styles.gridName, { color: textPrimary }]} numberOfLines={1}>{item.name}</Text>
                {item.type ? (
                  <Text style={[styles.gridMeta, { color: textMuted }]} numberOfLines={1}>{item.type}</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },

  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: GRID_H_PAD,
    gap: GRID_GAP,
  },

  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  gridPlaceholder: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gridInfo: { padding: 9 },
  gridName: { fontSize: 13, fontWeight: "700" },
  gridMeta: { fontSize: 12, marginTop: 2 },
});
