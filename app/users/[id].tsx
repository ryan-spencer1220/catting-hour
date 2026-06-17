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
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: accent }]}>
          <Skeleton style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 12 }} light />
          <Skeleton style={{ height: 22, width: 150, marginBottom: 6 }} light />
          <Skeleton style={{ height: 13, width: 88, marginBottom: 16 }} light />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={{ height: 56, width: 80, borderRadius: 14 }} light />
            ))}
          </View>
          <Skeleton style={{ height: 38, width: 150, borderRadius: 24, marginTop: 16 }} light />
        </View>
        <View style={{ flexDirection: "row", gap: GRID_GAP, marginTop: GRID_GAP }}>
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
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: accent }]}>
              {/* Decorative paw prints */}
              <View pointerEvents="none" style={styles.pawDecorTL}>
                <PawPrint size={72} color="rgba(255,255,255,0.1)" />
              </View>
              <View pointerEvents="none" style={styles.pawDecorTR}>
                <PawPrint size={48} color="rgba(255,255,255,0.08)" />
              </View>
              <View pointerEvents="none" style={styles.pawDecorBR}>
                <PawPrint size={90} color="rgba(255,255,255,0.06)" />
              </View>

              {/* Avatar */}
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

              {/* Stats pills */}
              <View style={styles.countsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.countNumber}>{followCounts.followers}</Text>
                  <Text style={styles.countLabel}>Followers</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.countNumber}>{followCounts.following}</Text>
                  <Text style={styles.countLabel}>Following</Text>
                </View>
                <View style={styles.statPill}>
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

  header: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },

  pawDecorTL: { position: "absolute", top: 8, left: -16 },
  pawDecorTR: { position: "absolute", top: 48, right: -8 },
  pawDecorBR: { position: "absolute", bottom: -20, right: 20 },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontSize: 32, fontWeight: "700" },
  displayName: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  city: { color: "rgba(255,255,255,0.8)", fontSize: 13 },

  countsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  statPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 74,
  },
  countNumber: { color: "#fff", fontSize: 20, fontWeight: "800" },
  countLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 2 },

  followBtn: {
    marginTop: 16,
    paddingHorizontal: 44,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#fff",
  },
  followingBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.6)" },
  followBtnText: { fontWeight: "700", fontSize: 15 },
  followingBtnText: { color: "#fff" },

  gridPlaceholder: { alignItems: "center", justifyContent: "center" },

  gridScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(0,0,0,0.48)",
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
