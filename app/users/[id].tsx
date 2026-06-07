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
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();

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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={dark ? accent : "#111827"} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={{ color: textPrimary }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>‹</Text>
      </Pressable>

      <FlatList
        data={cats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View>
            {/* Header band */}
            <View style={[styles.header, { paddingTop: insets.top + 56, backgroundColor: accent }]}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}

              <Text style={styles.displayName}>{displayName}</Text>
              {profile.city ? (
                <Text style={styles.city}>📍 {profile.city}</Text>
              ) : null}

              {/* Follow counts */}
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

              {/* Follow / Unfollow button */}
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

              {isOwnProfile && (
                <Text style={[styles.ownProfileNote, { color: "rgba(255,255,255,0.6)" }]}>
                  This is your profile
                </Text>
              )}
            </View>

            {/* Cats section header */}
            <Text style={[styles.sectionLabel, { color: textMuted, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }]}>
              Cats added
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: textMuted }]}>No cats added yet</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.catRow, { backgroundColor: card }]}
            onPress={() => router.push(`/cats/${item.id}`)}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.catThumb} />
            ) : (
              <View style={[styles.catThumb, { backgroundColor: dark ? "#2d3f55" : "#e5e7eb", alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 22 }}>🐾</Text>
              </View>
            )}
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: textPrimary }]}>{item.name}</Text>
              {item.type ? (
                <Text style={[styles.catMeta, { color: textMuted }]}>{item.type}</Text>
              ) : null}
            </View>
            <Text style={{ color: textMuted, fontSize: 20 }}>›</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
  backBtnText: { color: "#fff", fontSize: 26, lineHeight: 30, marginTop: -2 },

  header: {
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)", marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 28, fontWeight: "700" },
  displayName: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  city: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 },

  countsRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 8 },
  countItem: { alignItems: "center", paddingHorizontal: 16 },
  countNumber: { color: "#fff", fontSize: 20, fontWeight: "800" },
  countLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  countDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },

  followBtn: {
    marginTop: 20,
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#fff",
  },
  followingBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.6)" },
  followBtnText: { fontWeight: "700", fontSize: 15 },
  followingBtnText: { color: "#fff" },
  ownProfileNote: { marginTop: 16, fontSize: 13 },

  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },

  catRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  catThumb: { width: 56, height: 56, borderRadius: 8 },
  catInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: "700" },
  catMeta: { fontSize: 13, marginTop: 2 },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14 },
});
