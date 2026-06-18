import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat } from "@/lib/cats";
import {
  fetchFollowCounts,
  fetchProfile,
  followUser,
  isFollowing,
  type Profile,
  unfollowUser,
} from "@/lib/profiles";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FadeImage } from "@/components/fade-image";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ChevronLeft, MapPin, PawPrint } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GRID_GAP = 3;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const bg = dark ? "#0f1720" : "#f0f0f0";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#6b7280" : "#9ca3af";

  const cardWidth = (screenWidth - GRID_GAP) / 2;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function load() {
      const [{ data: sessionData }, profileResult, allCats, counts, followingState] =
        await Promise.all([
          supabase.auth.getSession(),
          fetchProfile(id),
          fetchAllCats(),
          fetchFollowCounts(id),
          isFollowing(id),
        ]);

      if (!mounted) return;

      const userId = sessionData.session?.user?.id ?? null;
      setCurrentUserId(userId);
      setProfile(profileResult);
      setCats(allCats.filter((c) => c.owner === id));
      setFollowCounts(counts);
      setFollowing(followingState);
      setLoading(false);
    }

    load().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  async function handleFollowToggle() {
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(id);
        setFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: c.followers - 1 }));
      } else {
        await followUser(id);
        setFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || String(e));
    } finally {
      setFollowLoading(false);
    }
  }

  const isOwnProfile = currentUserId === id;
  const displayName = profile?.username ?? "Unknown user";
  const initials = displayName.slice(0, 2).toUpperCase();
  const HERO_HEIGHT = insets.top + 280;
  const heroBg = cats[0]?.image ?? null;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        <Skeleton style={{ width: "100%", height: insets.top + 280, borderRadius: 0 }} />
        <View style={{ flexDirection: "row", gap: GRID_GAP, marginTop: GRID_GAP }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} style={{ width: cardWidth, height: cardWidth, borderRadius: 0 }} />
          ))}
        </View>
        <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </Pressable>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </Pressable>
        <Text style={{ color: textPrimary }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <FlatList
        data={cats}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View style={{ marginBottom: GRID_GAP }}>
            {/* Hero */}
            <View style={[styles.hero, { height: HERO_HEIGHT }]}>
              {/* Background: blurred cat photo or solid accent */}
              {heroBg ? (
                <Image
                  source={{ uri: heroBg }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={18}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: accent }]} />
              )}

              {/* Dark scrim */}
              <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

              {/* Centered content */}
              <View style={[styles.heroContent, { paddingTop: insets.top + 20 }]}>
                {/* Avatar */}
                <View style={styles.avatarRing}>
                  <View style={styles.avatarClip}>
                    {profile.avatarUrl ? (
                      <FadeImage uri={profile.avatarUrl} style={styles.avatarInner} />
                    ) : (
                      <View style={[styles.avatarInner, styles.avatarPlaceholder]}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.displayName}>{displayName}</Text>

                {profile.city ? (
                  <View style={styles.cityRow}>
                    <MapPin size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.city}>{profile.city}</Text>
                  </View>
                ) : null}

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{cats.length}</Text>
                    <Text style={styles.statLbl}>Cats</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{followCounts.followers}</Text>
                    <Text style={styles.statLbl}>Followers</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{followCounts.following}</Text>
                    <Text style={styles.statLbl}>Following</Text>
                  </View>
                </View>

                {!isOwnProfile && (
                  <Pressable
                    style={[
                      styles.followBtn,
                      following && styles.followingBtn,
                      followLoading && { opacity: 0.6 },
                    ]}
                    onPress={handleFollowToggle}
                    disabled={followLoading}
                  >
                    <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                      {followLoading ? "…" : following ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            <EmptyState
              icon={<PawPrint size={36} color={accent} />}
              title="No cats yet"
              body={isOwnProfile ? "You haven't added any cats. Get out there!" : "This user hasn't spotted any cats yet."}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ width: cardWidth, height: cardWidth }}
            onPress={() => router.push(`/cats/${item.id}`)}
          >
            {item.image ? (
              <FadeImage uri={item.image} style={{ width: cardWidth, height: cardWidth }} />
            ) : (
              <View style={[styles.gridPlaceholder, { width: cardWidth, height: cardWidth, backgroundColor: accent + "66" }]}>
                <PawPrint size={40} color="rgba(255,255,255,0.45)" />
              </View>
            )}
            {/* Gradient scrim simulation */}
            <View style={styles.gridScrim} />
            <View style={styles.gridOverlay}>
              <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
              {item.type ? <Text style={styles.gridMeta} numberOfLines={1}>{item.type}</Text> : null}
            </View>
          </Pressable>
        )}
      />

      {/* Back button */}
      <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <ChevronLeft size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  hero: {
    width: "100%",
    overflow: "hidden",
  },
  heroScrim: {
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  heroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 6,
  },

  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.6)",
    marginBottom: 4,
  },
  avatarClip: {
    width: "100%",
    height: "100%",
    borderRadius: 43,
    overflow: "hidden",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  avatarPlaceholder: {},
  initials: { color: "#fff", fontSize: 30, fontWeight: "700" },

  displayName: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  city: { color: "rgba(255,255,255,0.75)", fontSize: 13 },

  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 0 },
  statItem: { alignItems: "center", paddingHorizontal: 18 },
  statNum: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLbl: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600", marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },

  followBtn: {
    marginTop: 6,
    paddingHorizontal: 36,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "transparent",
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  followingBtnText: { color: "rgba(255,255,255,0.85)" },

  gridPlaceholder: { alignItems: "center", justifyContent: "center" },

  gridScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 52,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  gridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  gridName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  gridMeta: { color: "rgba(255,255,255,0.72)", fontSize: 11, marginTop: 2 },
});
