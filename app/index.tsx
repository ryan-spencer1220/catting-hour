import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Camera, Cat, Map, Users } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ONBOARDING_KEY = "@onboarding_seen";

const SLIDES = [
  {
    Icon: Cat,
    color: "#1B5091",
    title: "The Catting Hour",
    body: "Your neighbourhood cats, all in one place. Discover who's out there, share your sightings, and connect with fellow cat lovers.",
  },
  {
    Icon: Map,
    color: "#279D9F",
    title: "Find cats nearby",
    body: "Browse an interactive map of cat sightings in your area. Tap any pin to meet the cat.",
  },
  {
    Icon: Camera,
    color: "#E881A6",
    title: "Document encounters",
    body: "Add cats, upload photos, and log check-ins. Build a record of every cat you meet.",
  },
  {
    Icon: Users,
    color: "#CE3375",
    title: "Build your community",
    body: "Follow other cat lovers and get a personalised feed of their latest finds.",
  },
];

export default function IndexScreen() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setShowOnboarding(val !== "true");
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  async function completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return <AuthLanding />;
}

function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function next() {
    if (isLast) {
      onComplete();
    } else {
      const next = index + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }
  }

  return (
    <View style={styles.onboardingContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {SLIDES.map((s, i) => {
          const Icon = s.Icon;
          return (
            <View
              key={i}
              style={[styles.slide, { width, backgroundColor: s.color }]}
              // Only the visible slide should be read; the others are off screen.
              importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
              accessibilityElementsHidden={i !== index}
            >
              <View style={[styles.slideTop, { paddingTop: insets.top + 60 }]}>
                <View style={styles.iconRing} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <Icon size={64} color="#fff" />
                </View>
              </View>
              <View style={styles.slideBottom}>
                <Text style={styles.slideTitle} accessibilityRole="header">{s.title}</Text>
                <Text style={styles.slideBody}>{s.body}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Controls — sits over the slides */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Page ${index + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { opacity: i === index ? 1 : 0.35, backgroundColor: slide.color }]}
            />
          ))}
        </View>

        {/* Primary CTA */}
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: slide.color }]}
          onPress={next}
          accessibilityRole="button"
        >
          <Text style={styles.ctaBtnText}>{isLast ? "Get started" : "Next"}</Text>
        </Pressable>

        {/* Skip on non-last slides */}
        {!isLast && (
          <Pressable style={styles.skipBtn} onPress={onComplete} accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AuthLanding() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();

  const bg = dark ? "#0f1720" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#9ca3af" : "#6b7280";

  return (
    <View style={[styles.authContainer, { backgroundColor: bg, paddingBottom: insets.bottom + 24, paddingTop: insets.top + 24 }]}>
      <View style={styles.authTop}>
        <View
          style={[styles.authIconRing, { backgroundColor: dark ? "#1a2535" : "#f3f4f6" }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Cat size={48} color={accent} />
        </View>
        <Text style={[styles.authTitle, { color: textPrimary }]} accessibilityRole="header">
          The Catting Hour
        </Text>
        <Text style={[styles.authSubtitle, { color: textMuted }]}>Share and discover local cats</Text>
      </View>

      <View style={styles.authButtons}>
        <Pressable
          style={[styles.authBtn, { backgroundColor: accent }]}
          onPress={() => router.push("/(auth)/register")}
          accessibilityRole="button"
        >
          <Text style={styles.authBtnText}>Create account</Text>
        </Pressable>

        <Pressable
          style={[styles.authBtnOutline, { borderColor: dark ? "#374151" : "#e5e7eb" }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
        >
          <Text style={[styles.authBtnOutlineText, { color: textPrimary }]}>Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Onboarding ──────────────────────────────────────────────
  onboardingContainer: { flex: 1, backgroundColor: "#fff" },

  slide: { flex: 1 },
  slideTop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  slideBottom: {
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 160,
  },
  slideTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  slideBody: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    lineHeight: 24,
  },

  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  dots: { flexDirection: "row", gap: 7, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  ctaBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  skipBtn: { paddingVertical: 4 },
  skipText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },

  // ── Auth landing ─────────────────────────────────────────────
  authContainer: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24 },
  authTop: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  authIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  authTitle: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  authSubtitle: { fontSize: 16, textAlign: "center" },

  authButtons: { gap: 12 },
  authBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  authBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  authBtnOutline: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  authBtnOutlineText: { fontSize: 16, fontWeight: "600" },
});
