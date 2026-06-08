import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import { FadeImage } from "@/components/fade-image";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Map as MapIcon, PawPrint, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let Mapbox: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Mapbox = require("@rnmapbox/maps").default;
  const token = (Constants as any).expoConfig?.extra?.MAPBOX_ACCESS_TOKEN ?? "";
  Mapbox.setAccessToken(token);
} catch {}

const DEFAULT_CENTER: [number, number] = [-122.431297, 37.773972];
const DEFAULT_ZOOM = 12;
const CARD_SLIDE = 280;

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  const cardY = useSharedValue(CARD_SLIDE);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }] }));

  function showCallout(cat: Cat) {
    setSelectedCat(cat);
    cardY.value = withSpring(0, { damping: 22, stiffness: 220 });
  }

  function dismissCallout() {
    cardY.value = withTiming(CARD_SLIDE, { duration: 240 }, (finished) => {
      if (finished) runOnJS(setSelectedCat)(null);
    });
  }

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCenter([loc.coords.longitude, loc.coords.latitude]);
        }
      } catch {}
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      fetchAllCats()
        .then((rows) => { if (mounted) setCats(rows); })
        .catch(() => {});
      return () => { mounted = false; };
    }, [])
  );

  if (!Mapbox) {
    return (
      <View style={[styles.fallback, dark && styles.fallbackDark]}>
        <MapIcon size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
        <Text style={[styles.fallbackTitle, dark && styles.fallbackTitleDark]}>
          Development Build Required
        </Text>
        <Text style={styles.fallbackBody}>
          {"Native maps aren't available in Expo Go.\nRun a development build to use the map."}
        </Text>
        <Text style={[styles.fallbackCmd, { color: accent }]}>
          eas build --profile development
        </Text>
      </View>
    );
  }

  function handleMapPress(feature: GeoJSON.Feature) {
    if (selectedCat) {
      dismissCallout();
      return;
    }
    if (feature.geometry?.type !== "Point") return;
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
    router.push(`/cats/create?lng=${lng}&lat=${lat}`);
  }

  const styleURL = dark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street;

  const cardBg = dark ? "#1a2535" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#9ca3af" : "#6b7280";
  const tagBg = dark ? `${accent}22` : `${accent}18`;

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={styleURL}
        onPress={handleMapPress}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled
        compassPosition={{ bottom: 120, right: 16 }}
      >
        <Mapbox.Camera
          zoomLevel={DEFAULT_ZOOM}
          centerCoordinate={center}
          animationMode="none"
        />

        <Mapbox.UserLocation visible androidRenderMode="compass" />

        {cats
          .filter((c) => c.lat != null && c.lng != null)
          .map((cat) => {
            const selected = selectedCat?.id === cat.id;
            return (
              <Mapbox.MarkerView
                key={cat.id}
                coordinate={[cat.lng!, cat.lat!]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Pressable onPress={() => showCallout(cat)} hitSlop={8}>
                  <View
                    style={[
                      styles.marker,
                      selected && { backgroundColor: accent, borderColor: accent },
                      selected && styles.markerSelected,
                      dark && !selected && { backgroundColor: `${accent}33`, borderColor: accent },
                    ]}
                  >
                    <PawPrint size={selected ? 20 : 18} color={selected ? "#fff" : (dark ? accent : "#555")} />
                  </View>
                </Pressable>
              </Mapbox.MarkerView>
            );
          })}
      </Mapbox.MapView>

      {/* Hint — hide when callout is open */}
      {!selectedCat && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>Tap the map to add a cat</Text>
        </View>
      )}

      {/* Callout card */}
      <Animated.View
        style={[
          styles.callout,
          cardStyle,
          { backgroundColor: cardBg, paddingBottom: insets.bottom + 16 },
        ]}
        pointerEvents={selectedCat ? "auto" : "none"}
      >
        {selectedCat && (
          <>
            {/* Drag handle */}
            <View style={styles.handle} />

            <View style={styles.calloutRow}>
              {/* Thumbnail */}
              {selectedCat.image ? (
                <FadeImage uri={selectedCat.image} style={styles.calloutThumb} />
              ) : (
                <View style={[styles.calloutThumb, styles.calloutThumbPlaceholder, { backgroundColor: dark ? "#2d3f55" : "#f3f4f6" }]}>
                  <PawPrint size={24} color={dark ? "#4b5563" : "#d1d5db"} />
                </View>
              )}

              {/* Info */}
              <View style={styles.calloutInfo}>
                <Text style={[styles.calloutName, { color: textPrimary }]} numberOfLines={1}>
                  {selectedCat.name}
                </Text>
                {(selectedCat.type || selectedCat.temperament) && (
                  <View style={styles.calloutTags}>
                    {[selectedCat.type, selectedCat.temperament].filter(Boolean).map((tag) => (
                      <View key={tag} style={[styles.calloutTag, { backgroundColor: tagBg }]}>
                        <Text style={[styles.calloutTagText, { color: accent }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {selectedCat.ownerName && (
                  <Text style={[styles.calloutOwner, { color: textMuted }]} numberOfLines={1}>
                    by {selectedCat.ownerName}
                  </Text>
                )}
              </View>

              {/* Dismiss */}
              <Pressable style={styles.dismissBtn} onPress={dismissCallout} hitSlop={10}>
                <X size={18} color={textMuted} />
              </Pressable>
            </View>

            <Pressable
              style={[styles.viewBtn, { backgroundColor: accent }]}
              onPress={() => {
                dismissCallout();
                setTimeout(() => router.push(`/cats/${selectedCat.id}`), 160);
              }}
            >
              <Text style={styles.viewBtnText}>View cat</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    padding: 32,
  },
  fallbackDark: { backgroundColor: "#0f1720" },
  fallbackTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  fallbackTitleDark: { color: "#fff" },
  fallbackBody: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  fallbackCmd: { fontSize: 13, fontFamily: "monospace", fontWeight: "600" },

  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  markerSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },

  hint: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  hintText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  callout: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 14,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  calloutThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  calloutThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  calloutInfo: { flex: 1, gap: 5 },
  calloutName: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  calloutTags: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  calloutTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  calloutTagText: { fontSize: 11, fontWeight: "600" },
  calloutOwner: { fontSize: 12 },
  dismissBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  viewBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  viewBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
