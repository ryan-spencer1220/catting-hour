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
import { ChevronLeft, MapPin, PawPrint } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const GRID_H_PAD = 12;
  const GRID_GAP = 8;
  const cardWidth = (screenWidth - GRID_H_PAD * 2 - GRID_GAP) / 2;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        {/* Header band */}
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: 24, backgroundColor: accent, alignItems: "center" }}>
          <Skeleton style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 10 }} light />
          <Skeleton style={{ height: 20, width: 130, marginBottom: 6 }} light />
          <Skeleton style={{ height: 13, width: 80 }} light />
          <View style={{ flexDirection: "row", marginTop: 14, gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ alignItems: "center", paddingHorizontal: 14 }}>
                <Skeleton style={{ height: 18, width: 28, marginBottom: 5 }} light />
                <Skeleton style={{ height: 11, width: 52 }} light />
              </View>
            ))}
          </View>
          <Skeleton style={{ height: 36, width: 140, borderRadius: 24, marginTop: 14 }} light />
        </View>
        {/* Grid placeholder */}
        <View style={{ padding: 12, gap: 8 }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1].map((col) => (
                <Skeleton key={col} style={{ flex: 1, height: cardWidth * 0.85 + 50, borderRadius: 12 }} />
              ))}
            </View>
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
        columnWrapperStyle={{ paddingHorizontal: GRID_H_PAD, gap: GRID_GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View>
            {/* Header band */}
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: accent }]}>
              {profile.avatarUrl ? (
                <FadeImage uri={profile.avatarUrl} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}

              <Text style={styles.displayName}>{displayName}</Text>
              {profile.city ? (
                <View style={styles.cityRow}>
                  <MapPin size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.city}>{profile.city}</Text>
                </View>
              ) : null}

              {/* Stats row */}
              <View style={styles.countsRow}>
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>{followCounts.followers}</Text>
                  <Text style={styles.countLabel}>Followers</Text>
                </View>
                <View style={styles.countDivider} />
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>{followCounts.following}</Text>
                  <Text style={styles.countLabel}>Following</Text>
                </View>
                <View style={styles.countDivider} />
                <View style={styles.countItem}>
                  <Text style={styles.countNumber}>{cats.length}</Text>
                  <Text style={styles.countLabel}>Cats</Text>
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
                  <Text style={[styles.followBtnText, { color: accent }, following && styles.followingBtnText]}>
                    {followLoading ? "…" : following ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Cats section header */}
            <Text style={[styles.sectionLabel, { color: textMuted }]}>
              Cats added
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: textMuted }]}>No cats added yet</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.gridCard, { backgroundColor: card, width: cardWidth }]}
            onPress={() => router.push(`/cats/${item.id}`)}
          >
            {item.image ? (
              <FadeImage uri={item.image} style={{ width: cardWidth, height: cardWidth * 0.85, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
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

  header: {
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)", marginBottom: 10 },
  avatarPlaceholder: { backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 24, fontWeight: "700" },
  displayName: { color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  city: { color: "rgba(255,255,255,0.8)", fontSize: 13 },

  countsRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 },
  countItem: { alignItems: "center", paddingHorizontal: 14 },
  countNumber: { color: "#fff", fontSize: 18, fontWeight: "800" },
  countLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  countDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.3)" },

  followBtn: {
    marginTop: 14,
    paddingHorizontal: 36,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: "#fff",
  },
  followingBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.6)" },
  followBtnText: { fontWeight: "700", fontSize: 14 },
  followingBtnText: { color: "#fff" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
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

  empty: { textAlign: "center", marginTop: 32, fontSize: 14 },
});
