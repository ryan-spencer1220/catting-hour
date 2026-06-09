import { useAccent, useThemeContext } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import { formatDistance, haversineDistance, radiusToKm } from "@/lib/distance";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FadeImage } from "@/components/fade-image";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Compass, MapPin, PawPrint } from "lucide-react-native";
import * as Linking from "expo-linking";
const RADII = [1, 5, 10] as const;
type Radius = (typeof RADII)[number];


type CatWithDistance = Cat & { distance: number };

export default function RecentlyScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const { useMetric } = useThemeContext();
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
    const radiusKm = radiusToKm(radius, useMetric);
    return cats
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => ({
        ...c,
        distance: haversineDistance(location.lat, location.lng, c.lat!, c.lng!),
      }))
      .filter((c) => c.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }, [cats, location, radius, useMetric]);

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
        <Text style={[styles.distance, { color: accent }]}>{formatDistance(item.distance, useMetric)}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <View style={[styles.iconRing, { backgroundColor: dark ? `${accent}25` : `${accent}18` }]}>
          <Compass size={22} color={accent} />
        </View>
        <Text style={[styles.heading, { color: textPrimary }]}>Nearby</Text>
      </View>

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
                {r} {useMetric ? "km" : "mi"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ padding: 12, paddingTop: 8, gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, backgroundColor: card, padding: 12, borderRadius: 12, alignItems: "center" }}>
              <Skeleton style={{ width: 56, height: 56, borderRadius: 8 }} />
              <View style={{ flex: 1, gap: 9 }}>
                <Skeleton style={{ height: 15, width: "55%" }} />
                <Skeleton style={{ height: 13, width: "35%" }} />
              </View>
            </View>
          ))}
        </View>
      ) : locationDenied ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon={<MapPin size={36} color={accent} />}
            title="We don't know where you are"
            body="Enable location access so we can find cats in your neighbourhood."
            cta={{ label: "Open Settings", onPress: () => Linking.openSettings() }}
          />
        </View>
      ) : (
        <FlatList
          data={nearbyCats}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 12, paddingTop: 8, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              icon={<PawPrint size={36} color={accent} />}
              title="No cats spotted nearby"
              body={`They must be napping. Try widening the search radius or add one yourself.`}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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

});
