import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Map as MapIcon, PawPrint } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

// @rnmapbox/maps requires a native dev build — not available in Expo Go.
// We do a runtime require so the module error doesn't crash the whole app.
let Mapbox: any = null;
try {
  Mapbox = require("@rnmapbox/maps").default;
  const token = (Constants as any).expoConfig?.extra?.MAPBOX_ACCESS_TOKEN ?? "";
  Mapbox.setAccessToken(token);
} catch {}

const DEFAULT_CENTER: [number, number] = [-122.431297, 37.773972];
const DEFAULT_ZOOM = 12;

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const router = useRouter();

  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [cats, setCats] = useState<Cat[]>([]);

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
          Native maps aren't available in Expo Go.{"\n"}Run a development build to use the map.
        </Text>
        <Text style={[styles.fallbackCmd, { color: accent }]}>
          eas build --profile development
        </Text>
      </View>
    );
  }

  function handleMapPress(feature: GeoJSON.Feature) {
    if (feature.geometry?.type !== "Point") return;
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
    router.push(`/cats/create?lng=${lng}&lat=${lat}`);
  }

  const styleURL = dark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street;

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
          .map((cat) => (
            <Mapbox.MarkerView
              key={cat.id}
              coordinate={[cat.lng!, cat.lat!]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Pressable
                onPress={() => router.push(`/cats/${cat.id}`)}
                hitSlop={8}
              >
                <View style={[styles.marker, dark && { backgroundColor: `${accent}33`, borderColor: accent }]}>
                  <PawPrint size={18} color={dark ? accent : "#555"} />
                </View>
              </Pressable>
            </Mapbox.MarkerView>
          ))}
      </Mapbox.MapView>

      <View style={styles.hint} pointerEvents="none">
        <Text style={styles.hintText}>Tap the map to add a cat</Text>
      </View>
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
});
