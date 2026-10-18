import { useAccent } from "@/context/theme";
import { useTabBarVisibility } from "@/context/tab-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import { FadeImage } from "@/components/fade-image";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapIcon, PawPrint, X } from "lucide-react-native";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
const CARD_SLIDE = 480;
// Swipe distances (px) past which the preview commits to an action on release.
const OPEN_THRESHOLD = 40; // drag up → open full details
const CLOSE_THRESHOLD = 70; // drag down → dismiss

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setHidden } = useTabBarVisibility();

  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [cats, setCats] = useState<Cat[]>([]);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  const cameraRef = useRef<any>(null);
  const shapeSourceRef = useRef<any>(null);
  // Prevents MapView.onPress from also firing when a source feature was tapped
  const didHandleSourcePress = useRef(false);

  const cardY = useSharedValue(CARD_SLIDE);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }] }));

  function showCallout(cat: Cat) {
    setSelectedCat(cat);
    setHidden(true);
    AccessibilityInfo.announceForAccessibility(`${cat.name} selected`);
    cardY.value = withSpring(0, { damping: 26, stiffness: 220 });
  }

  function dismissCallout() {
    setHidden(false);
    cardY.value = withTiming(CARD_SLIDE, { duration: 240 }, (finished) => {
      if (finished) runOnJS(setSelectedCat)(null);
    });
  }

  // Slide the card up and off as the detail screen pushes in, then park it
  // below again so the next preview animates up cleanly.
  function openDetail(id: string) {
    setHidden(false);
    cardY.value = withTiming(-CARD_SLIDE * 2, { duration: 220 }, (finished) => {
      if (finished) {
        cardY.value = CARD_SLIDE;
        runOnJS(setSelectedCat)(null);
      }
    });
    router.push(`/cats/${id}`);
  }

  // Reads the selected cat on the JS thread (kept out of the gesture worklet).
  function openSelectedDetail() {
    const id = selectedCat?.id;
    if (id) openDetail(id);
    else cardY.value = withSpring(0, { damping: 26, stiffness: 220 });
  }

  // Drag the preview: up past OPEN_THRESHOLD (or a fast upward flick) opens the
  // full details, down past CLOSE_THRESHOLD dismisses; otherwise it springs back.
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onChange((e) => {
      cardY.value = Math.max(-120, cardY.value + e.changeY);
    })
    .onEnd((e) => {
      if (e.translationY < -OPEN_THRESHOLD || e.velocityY < -800) {
        runOnJS(openSelectedDetail)();
      } else if (e.translationY > CLOSE_THRESHOLD || e.velocityY > 800) {
        runOnJS(dismissCallout)();
      } else {
        cardY.value = withSpring(0, { damping: 26, stiffness: 220 });
      }
    });

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
      return () => {
        mounted = false;
        // Restore the tab bar if we leave the map while a preview is open.
        setHidden(false);
      };
    }, [setHidden])
  );

  // Build GeoJSON from cats — memoised so it only rebuilds when cats change
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: cats
      .filter((c) => c.lat != null && c.lng != null)
      .map((cat) => ({
        type: "Feature",
        id: cat.id,
        geometry: { type: "Point", coordinates: [cat.lng!, cat.lat!] },
        properties: { id: cat.id, name: cat.name },
      })),
  }), [cats]);

  // ── Tap handlers ──────────────────────────────────────────────────────────

  async function handleSourcePress(e: any) {
    didHandleSourcePress.current = true;
    const feature = e.features?.[0];
    if (!feature) return;

    if (feature.properties?.cluster) {
      // Zoom to the level where this cluster breaks apart
      try {
        const zoom = await shapeSourceRef.current?.getClusterExpansionZoom(feature);
        cameraRef.current?.setCamera({
          centerCoordinate: feature.geometry.coordinates,
          zoomLevel: zoom ?? 14,
          animationDuration: 350,
          animationMode: "flyTo",
        });
      } catch {}
    } else {
      const cat = cats.find((c) => c.id === feature.properties?.id);
      if (cat) showCallout(cat);
    }
  }

  function handleMapPress(feature: GeoJSON.Feature) {
    // Swallow the event if a source press already handled it this frame
    if (didHandleSourcePress.current) {
      didHandleSourcePress.current = false;
      return;
    }
    if (selectedCat) {
      dismissCallout();
      return;
    }
    if (feature.geometry?.type !== "Point") return;
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
    router.push(`/cats/create?lng=${lng}&lat=${lat}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!Mapbox) {
    return (
      <View style={[styles.fallback, dark && styles.fallbackDark]}>
        <MapIcon size={48} color="#9ca3af" style={{ marginBottom: 16 }} accessible={false} />
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

  const styleURL = dark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street;
  const cardBg = dark ? "#1a2535" : "#fff";
  const textMuted = dark ? "#9ca3af" : "#6b7280";

  // Layer style expressions — cluster size steps: <10 → 22px, 10-49 → 30px, 50+ → 38px
  const clusterCircleStyle = {
    circleRadius: ["step", ["get", "point_count"], 22, 10, 30, 50, 38] as any,
    circleColor: accent,
    circleOpacity: 1,
    circleStrokeWidth: 3,
    circleStrokeColor: "rgba(255,255,255,0.85)",
  };
  const clusterCountStyle = {
    // Full lumped count, coerced to a string so the symbol always renders
    textField: ["to-string", ["get", "point_count"]] as any,
    // Size scales with the circle so larger clusters stay legible
    textSize: ["step", ["get", "point_count"], 13, 10, 15, 50, 17] as any,
    textColor: "#fff",
    // No custom textFont — fall back to the style's default glyphs so the
    // count never silently disappears when a font isn't in the glyph set.
    textAllowOverlap: true,
    textIgnorePlacement: true,
  };
  const pointCircleStyle = {
    circleRadius: 16,
    circleColor: dark ? `${accent}33` : "rgba(255,255,255,0.95)",
    circleStrokeWidth: 2,
    circleStrokeColor: selectedCat
      ? ["case", ["==", ["get", "id"], selectedCat.id], accent, dark ? accent : "rgba(0,0,0,0.12)"] as any
      : (dark ? accent : "rgba(0,0,0,0.12)"),
    circleSortKey: ["case", ["==", ["get", "id"], selectedCat?.id ?? ""], 2, 1] as any,
    circleOpacity: 1,
  };
  const pointIconStyle = {
    // Emoji glyphs aren't in Mapbox's default font stack, so 🐾 as textField
    // silently fails and leaves a bare circle. Use a rasterised SDF paw image
    // (registered via <Mapbox.Images> below) that we can tint with iconColor.
    iconImage: "paw",
    iconSize: 1,
    iconAllowOverlap: true,
    iconIgnorePlacement: true,
    iconColor: selectedCat
      ? ["case", ["==", ["get", "id"], selectedCat.id], accent, dark ? accent : "#555"] as any
      : (dark ? accent : "#555"),
  };

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
          ref={cameraRef}
          zoomLevel={DEFAULT_ZOOM}
          centerCoordinate={center}
          animationMode="none"
        />

        <Mapbox.UserLocation visible androidRenderMode="compass" />

        {/* Rasterise a paw into an SDF map icon so single points show a paw
            (tinted via iconColor) instead of a bare circle. */}
        <Mapbox.Images>
          <Mapbox.Image name="paw" sdf>
            <View style={styles.pawIcon}>
              <PawPrint size={18} color="#000" fill="#000" strokeWidth={2} />
            </View>
          </Mapbox.Image>
        </Mapbox.Images>

        <Mapbox.ShapeSource
          ref={shapeSourceRef}
          id="cats-source"
          shape={geojson}
          cluster
          clusterRadius={48}
          clusterMaxZoom={14}
          onPress={handleSourcePress}
        >
          {/* Cluster circles */}
          <Mapbox.CircleLayer
            id="cluster-circle"
            filter={["has", "point_count"]}
            style={clusterCircleStyle}
          />

          {/* Cluster count labels */}
          <Mapbox.SymbolLayer
            id="cluster-count"
            filter={["has", "point_count"]}
            style={clusterCountStyle}
          />

          {/* Individual point circles */}
          <Mapbox.CircleLayer
            id="point-circle"
            filter={["!", ["has", "point_count"]]}
            style={pointCircleStyle}
          />

          {/* Individual point paw icons */}
          <Mapbox.SymbolLayer
            id="point-icon"
            filter={["!", ["has", "point_count"]]}
            style={pointIconStyle}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      {/* Hint — sits just above the floating tab bar so it isn't obscured */}
      {!selectedCat && (
        <View
          style={[styles.hint, { bottom: Math.max(insets.bottom, 12) + 76 }]}
          pointerEvents="none"
        >
          <Text style={styles.hintText}>Tap the map to add a cat</Text>
        </View>
      )}

      {/* Callout card — swipe up to open details, down to dismiss */}
      <GestureDetector gesture={panGesture}>
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
            <View style={styles.handle} importantForAccessibility="no" />

            {/* Large hero photo with the name + tags overlaid */}
            <View style={styles.hero}>
              {selectedCat.image ? (
                <FadeImage
                  uri={selectedCat.image}
                  style={styles.heroImg}
                  accessibilityLabel={`Photo of ${selectedCat.name}`}
                />
              ) : (
                <View
                  style={[styles.heroImg, styles.heroPlaceholder, { backgroundColor: dark ? "#2d3f55" : "#f3f4f6" }]}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <PawPrint size={48} color={dark ? "#4b5563" : "#d1d5db"} />
                </View>
              )}

              <View style={styles.heroOverlay} pointerEvents="none">
                <Text style={styles.heroName} numberOfLines={1} accessibilityRole="header">
                  {selectedCat.name}
                </Text>
                {(selectedCat.type || selectedCat.temperament) && (
                  <View style={styles.heroTags}>
                    {[selectedCat.type, selectedCat.temperament].filter(Boolean).map((tag) => (
                      <View key={tag} style={styles.heroTag}>
                        <Text style={styles.heroTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Pressable
                style={styles.heroDismiss}
                onPress={dismissCallout}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close preview"
              >
                <X size={18} color="#fff" />
              </Pressable>
            </View>

            {selectedCat.ownerName && (
              <Text style={[styles.calloutOwner, { color: textMuted }]} numberOfLines={1}>
                Spotted by{" "}
                <Text style={[styles.calloutOwnerName, { color: accent }]}>{selectedCat.ownerName}</Text>
              </Text>
            )}

            <Pressable
              style={[styles.viewBtn, { backgroundColor: accent }]}
              onPress={() => openDetail(selectedCat.id)}
              accessibilityRole="button"
              accessibilityLabel={`View ${selectedCat.name}`}
            >
              <Text style={styles.viewBtnText}>View cat</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
      </GestureDetector>
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

  hint: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  hintText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  pawIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" },

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
  hero: { position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 14 },
  heroImg: { width: "100%", height: 210 },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroOverlay: { position: "absolute", left: 16, right: 16, bottom: 14, gap: 8 },
  heroName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroTags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  heroTag: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  heroTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  heroDismiss: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutOwner: { fontSize: 14, fontWeight: "500", marginBottom: 12 },
  calloutOwnerName: { fontWeight: "800" },
  viewBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  viewBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
