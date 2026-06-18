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

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        {/* Banner skeleton */}
        <Skeleton style={{ width: "100%", height: 130 + insets.top + 8, borderRadius: 0 }} />
        {/* Avatar + info skeleton */}
        <View style={{ paddingHorizontal: 16, marginTop: -44 }}>
          <Skeleton style={{ width: 88, height: 88, borderRadius: 44 }} />
          <Skeleton style={{ height: 20, width: 150, marginTop: 10 }} />
          <Skeleton style={{ height: 13, width: 90, marginTop: 6 }} />
          <Skeleton style={{ height: 14, width: 220, marginTop: 10 }} />
        </View>
        <View style={{ flexDirection: "row", gap: GRID_GAP, marginTop: 16 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} style={{ width: cardWidth, height: cardWidth, borderRadius: 0 }} />
          ))}
        </View>
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
            {/* Banner — rectangular, no radius */}
            <View style={[styles.banner, { paddingTop: insets.top + 8, backgroundColor: accent }]}>
              <View pointerEvents="none" style={styles.pawDecorTL}>
                <PawPrint size={80} color="rgba(255,255,255,0.1)" />
              </View>
              <View pointerEvents="none" style={styles.pawDecorTR}>
                <PawPrint size={50} color="rgba(255,255,255,0.07)" />
              </View>
              <View pointerEvents="none" style={styles.pawDecorBR}>
                <PawPrint size={110} color="rgba(255,255,255,0.055)" />
              </View>
            </View>

            {/* Avatar + follow button row — bleeds over banner */}
            <View style={[styles.avatarRow, { backgroundColor: bg }]}>
              <View style={[styles.avatarRing, { borderColor: bg }]}>
                <View style={styles.avatarClip}>
                  {profile.avatarUrl ? (
                    <FadeImage uri={profile.avatarUrl} style={styles.avatarInner} />
                  ) : (
                    <View style={[styles.avatarInner, styles.avatarPlaceholder]}>
                      <Text style={[styles.initials, { color: "#fff" }]}>{initials}</Text>
                    </View>
                  )}
                </View>
              </View>

              {!isOwnProfile && (
                <Pressable
                  style={[
                    styles.followBtn,
                    { borderColor: accent },
                    following && { backgroundColor: accent },
                    followLoading && { opacity: 0.6 },
                  ]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                >
                  <Text style={[styles.followBtnText, { color: accent }, following && { color: "#fff" }]}>
                    {followLoading ? "…" : following ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Info — left-aligned under avatar */}
            <View style={[styles.info, { backgroundColor: bg }]}>
              <Text style={[styles.displayName, { color: textPrimary }]}>{displayName}</Text>
              {profile.city ? (
                <View style={styles.cityRow}>
                  <MapPin size={12} color={textMuted} />
                  <Text style={[styles.city, { color: textMuted }]}>{profile.city}</Text>
                </View>
              ) : null}
              <View style={styles.statsRow}>
                <Text style={[styles.statNum, { color: textPrimary }]}>{cats.length}</Text>
                <Text style={[styles.statLbl, { color: textMuted }]}> cats</Text>
                <Text style={[styles.statSep, { color: textMuted }]}> · </Text>
                <Text style={[styles.statNum, { color: textPrimary }]}>{followCounts.followers}</Text>
                <Text style={[styles.statLbl, { color: textMuted }]}> followers</Text>
                <Text style={[styles.statSep, { color: textMuted }]}> · </Text>
                <Text style={[styles.statNum, { color: textPrimary }]}>{followCounts.following}</Text>
                <Text style={[styles.statLbl, { color: textMuted }]}> following</Text>
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

  banner: {
    height: 130,
  },

  pawDecorTL: { position: "absolute", top: 12, left: -18 },
  pawDecorTR: { position: "absolute", top: 30, right: -10 },
  pawDecorBR: { position: "absolute", bottom: -28, right: 16 },

  // Avatar bleeds up over the banner by half its height (44px)
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: -44,
    paddingBottom: 10,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    // borderColor set inline to match bg
  },
  avatarClip: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    overflow: "hidden",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  avatarPlaceholder: {},
  initials: { fontSize: 30, fontWeight: "700" },

  followBtn: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    marginBottom: 6,
  },
  followBtnText: { fontWeight: "700", fontSize: 14 },

  info: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  displayName: { fontSize: 20, fontWeight: "800" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  city: { fontSize: 13 },
  statsRow: { flexDirection: "row", alignItems: "baseline", marginTop: 8, flexWrap: "wrap" },
  statNum: { fontSize: 14, fontWeight: "700" },
  statLbl: { fontSize: 14 },
  statSep: { fontSize: 14 },

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
