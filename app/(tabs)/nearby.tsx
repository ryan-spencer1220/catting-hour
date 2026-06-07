import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FadeImage } from "@/components/fade-image";
import { PawPrint } from "lucide-react-native";
const RADII = [1, 5, 10] as const;
type Radius = (typeof RADII)[number];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(miles: number): string {
  if (miles < 0.1) return "< 0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

type CatWithDistance = Cat & { distance: number };

export default function RecentlyScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const router = useRouter();

  const bg = dark ? "#0f1720" : "#fff";
  const card = dark ? "#1a2535" : "#f9fafb";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#6b7280" : "#9ca3af";

  const [radius, setRadius] = useState<Radius>(5);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);

      async function load() {
        // Request location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) { setLocationDenied(true); setLoading(false); }
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });

        // Fetch cats
        const rows = await fetchAllCats();
        if (mounted) { setCats(rows); setLoading(false); }
      }

      load().catch(() => { if (mounted) setLoading(false); });
      return () => { mounted = false; };
    }, [])
  );

  const nearbyCats = useMemo((): CatWithDistance[] => {
    if (!location) return [];
    return cats
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => ({
        ...c,
        distance: haversineDistance(location.lat, location.lng, c.lat!, c.lng!),
      }))
      .filter((c) => c.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [cats, location, radius]);

  function renderItem({ item }: { item: CatWithDistance }) {
    return (
      <Pressable style={[styles.card, { backgroundColor: card }]} onPress={() => router.push(`/cats/${item.id}`)}>
        {item.image ? (
          <FadeImage uri={item.image} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: dark ? "#2d3f55" : "#e5e7eb" }]}>
            <PawPrint size={22} color={dark ? "#6b7280" : "#9ca3af"} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: textPrimary }]}>{item.name}</Text>
          <Text style={[styles.meta, { color: textMuted }]}>
            {[item.type, item.temperament].filter(Boolean).join(" · ")}
          </Text>
          {item.ownerName ? (
            <Text style={[styles.sub, { color: textMuted }]}>Added by {item.ownerName}</Text>
          ) : null}
        </View>
        <Text style={[styles.distance, { color: accent }]}>{formatDistance(item.distance)}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]}>
      <Text style={[styles.heading, { color: textPrimary }]}>Nearby</Text>

      {/* Radius toggle */}
      <View style={[styles.toggleRow, { backgroundColor: dark ? "#1a2535" : "#f3f4f6" }]}>
        {RADII.map((r) => {
          const active = r === radius;
          return (
            <Pressable
              key={r}
              style={[styles.toggleBtn, active && { backgroundColor: accent }]}
              onPress={() => setRadius(r)}
            >
              <Text style={[styles.toggleText, { color: active ? "#fff" : textMuted }]}>
                {r} mi
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={dark ? accent : "#111827"} />
      ) : locationDenied ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: textMuted }]}>
            Location access is required to show nearby cats.
          </Text>
        </View>
      ) : (
        <FlatList
          data={nearbyCats}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 12, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: textMuted }]}>
                No cats found within {radius} {radius === 1 ? "mile" : "miles"}.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  toggleRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "transparent" },
  toggleText: { fontSize: 14, fontWeight: "600" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  image: { width: 64, height: 64, borderRadius: 8 },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 13, marginTop: 3 },
  sub: { fontSize: 12, marginTop: 2 },
  distance: { fontSize: 13, fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
