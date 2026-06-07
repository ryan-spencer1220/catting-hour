import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { uploadImage } from "@/lib/cats";
import { supabase } from "@/lib/supabase";
import { signOut as supabaseSignOut } from "@/lib/auth";
import { ACHIEVEMENTS, checkAndUnlockFollowerAchievements, getUnlockedAchievements } from "@/lib/achievements";
import { fetchFollowCounts, syncProfile } from "@/lib/profiles";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FadeImage } from "@/components/fade-image";
import { Calendar, Cat, Clock, Globe, Lock, MapPin, PawPrint, Pencil } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Stats = {
  totalCats: number;
  myCats: number;
  myCheckins: number;
  lastCatAdded: { name: string; createdAt: string } | null;
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bg = dark ? "#0f1720" : "#f5f5f7";
  const card = dark ? "#1a2535" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#6b7280" : "#9ca3af";
  const divider = dark ? "#1e2d3d" : "#e5e7eb";
  const inputBg = dark ? "#0f1720" : "#f9fafb";
  const inputBorder = dark ? "#374151" : "#e5e7eb";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [editingCity, setEditingCity] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [savingCity, setSavingCity] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function load() {
        // Load user — redirect to login if not authenticated
        try {
          const { data } = await supabase.auth.getUser();
          const u = data?.user ?? null;
          if (mounted) {
            if (!u) router.replace("/");
            else setUser(u);
          }
        } catch {
          if (mounted) router.replace("/");
        } finally {
          if (mounted) setLoading(false);
        }

        // Load follow counts
        try {
          const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;
          if (userId) {
            const counts = await fetchFollowCounts(userId);
            if (mounted) setFollowCounts(counts);
            await checkAndUnlockFollowerAchievements(counts.followers);
          }
        } catch {}

        // Load stats
        try {
          const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;

          const [
            { count: totalCats },
            { count: myCats },
            { count: myCheckins },
            { data: lastCatRow },
          ] = await Promise.all([
            supabase.from("cats").select("*", { count: "exact", head: true }),
            userId
              ? supabase.from("cats").select("*", { count: "exact", head: true }).eq("owner", userId)
              : Promise.resolve({ count: 0 }),
            userId
              ? supabase.from("checkins").select("*", { count: "exact", head: true }).eq("author", userId)
              : Promise.resolve({ count: 0 }),
            supabase
              .from("cats")
              .select("name, created_at")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          if (mounted) {
            setStats({
              totalCats: totalCats ?? 0,
              myCats: myCats ?? 0,
              myCheckins: myCheckins ?? 0,
              lastCatAdded: lastCatRow
                ? { name: lastCatRow.name, createdAt: lastCatRow.created_at }
                : null,
            });
          }
        } catch {
          if (mounted) setStats(null);
        } finally {
          if (mounted) setStatsLoading(false);
        }
      }

      getUnlockedAchievements().then((ids) => {
        if (mounted) setUnlockedIds(ids);
      });

      load();
      return () => { mounted = false; };
    }, [router])
  );

  async function handlePickAvatar() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Photo library access is needed to set a profile photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setUploadingAvatar(true);
      const url = await uploadImage(uri);
      await Promise.all([
        supabase.auth.updateUser({ data: { avatar_url: url } }),
        syncProfile({ avatarUrl: url }),
      ]);
      setUser((prev: any) => prev
        ? { ...prev, user_metadata: { ...prev.user_metadata, avatar_url: url } }
        : prev
      );
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || String(e));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveCity() {
    setSavingCity(true);
    try {
      const trimmed = cityDraft.trim();
      await Promise.all([
        supabase.auth.updateUser({ data: { city: trimmed || null } }),
        syncProfile({ city: trimmed || null }),
      ]);
      setUser((prev: any) => prev
        ? { ...prev, user_metadata: { ...prev.user_metadata, city: trimmed || null } }
        : prev
      );
      setEditingCity(false);
    } catch (e: any) {
      Alert.alert("Failed to save", e?.message || String(e));
    } finally {
      setSavingCity(false);
    }
  }

  function startEditCity() {
    setCityDraft(user?.user_metadata?.city ?? "");
    setEditingCity(true);
  }

  async function saveUsername() {
    const trimmed = usernameDraft.trim();
    if (!trimmed) {
      Alert.alert("Required", "Username cannot be empty.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(trimmed)) {
      Alert.alert("Invalid username", "Username must be 2–30 characters: letters, numbers, _ or -");
      return;
    }
    setSavingUsername(true);
    try {
      await Promise.all([
        supabase.auth.updateUser({ data: { username: trimmed } }),
        syncProfile({ username: trimmed }),
      ]);
      setUser((prev: any) => prev
        ? { ...prev, user_metadata: { ...prev.user_metadata, username: trimmed } }
        : prev
      );
      setEditingUsername(false);
    } catch (e: any) {
      const msg = e?.message || String(e);
      Alert.alert(
        "Failed to save",
        msg.includes("unique") ? "That username is already taken." : msg
      );
    } finally {
      setSavingUsername(false);
    }
  }

  function startEditUsername() {
    setUsernameDraft(user?.user_metadata?.username ?? "");
    setEditingUsername(true);
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await supabaseSignOut();
          } catch (e: any) {
            Alert.alert("Sign out failed", e?.message || String(e));
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  const displayName = user?.user_metadata?.username ?? "";
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const city = user?.user_metadata?.city ?? null;
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header band ── */}
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: accent }]}>

        {/* Avatar column */}
        <Pressable style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : avatarUrl ? (
            <FadeImage uri={avatarUrl} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
          <View style={[styles.avatarEditBadge, { borderColor: accent }]}>
            <Pencil size={12} color={accent} />
          </View>
        </Pressable>

        {/* Info column */}
        {loading ? (
          <ActivityIndicator color="#fff" style={{ flex: 1 }} />
        ) : (
          <View style={styles.headerInfo}>
            {editingUsername ? (
              <View style={styles.cityEditRow}>
                <TextInput
                  style={[styles.cityInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                  value={usernameDraft}
                  onChangeText={setUsernameDraft}
                  placeholder="Username"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={saveUsername}
                />
                <Pressable style={styles.citySaveBtn} onPress={saveUsername} disabled={savingUsername}>
                  <Text style={styles.citySaveBtnText}>{savingUsername ? "…" : "Save"}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={startEditUsername}>
                <Text style={styles.displayName}>{displayName || "Set username"}</Text>
              </Pressable>
            )}

            {editingCity ? (
              <View style={[styles.cityEditRow, { marginTop: 6 }]}>
                <TextInput
                  style={[styles.cityInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                  value={cityDraft}
                  onChangeText={setCityDraft}
                  placeholder="Your city"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveCity}
                />
                <Pressable style={styles.citySaveBtn} onPress={saveCity} disabled={savingCity}>
                  <Text style={styles.citySaveBtnText}>{savingCity ? "…" : "Save"}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.cityRow} onPress={startEditCity}>
                <MapPin size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.cityText}>{city ?? "Add location"}</Text>
              </Pressable>
            )}

            {memberSince ? (
              <Text style={styles.memberSince}>Member since {memberSince}</Text>
            ) : null}

            {/* Follow counts */}
            <View style={styles.followCountsRow}>
              <View style={styles.followCountItem}>
                <Text style={styles.followCountNumber}>{followCounts.followers}</Text>
                <Text style={styles.followCountLabel}>Followers</Text>
              </View>
              <View style={styles.followCountDivider} />
              <View style={styles.followCountItem}>
                <Text style={styles.followCountNumber}>{followCounts.following}</Text>
                <Text style={styles.followCountLabel}>Following</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Stats ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 12 }}>

        {/* Your activity */}
        <Text style={[styles.sectionLabel, { color: textMuted }]}>Your activity</Text>
        <View style={[styles.statCard, { backgroundColor: card }]}>
          <StatRow
            icon={<PawPrint size={16} color={textMuted} />}
            label="Cats logged"
            value={statsLoading ? null : String(stats?.myCats ?? 0)}
            textPrimary={textPrimary}
            textMuted={textMuted}
          />
          <View style={[styles.statDivider, { backgroundColor: divider }]} />
          <StatRow
            icon={<Cat size={16} color={textMuted} />}
            label="Check-ins"
            value={statsLoading ? null : String(stats?.myCheckins ?? 0)}
            textPrimary={textPrimary}
            textMuted={textMuted}
          />
          <View style={[styles.statDivider, { backgroundColor: divider }]} />
          <StatRow
            icon={<Calendar size={16} color={textMuted} />}
            label="Last cat added"
            value={statsLoading ? null : stats?.lastCatAdded ? timeAgo(stats.lastCatAdded.createdAt) : "—"}
            sub={stats?.lastCatAdded?.name}
            textPrimary={textPrimary}
            textMuted={textMuted}
          />
        </View>

        {/* Community */}
        <Text style={[styles.sectionLabel, { color: textMuted, marginTop: 8 }]}>Community</Text>
        <View style={[styles.statCard, { backgroundColor: card }]}>
          <StatRow
            icon={<Globe size={16} color={textMuted} />}
            label="Total cats"
            value={statsLoading ? null : String(stats?.totalCats ?? 0)}
            textPrimary={textPrimary}
            textMuted={textMuted}
          />
          <View style={[styles.statDivider, { backgroundColor: divider }]} />
          <StatRow
            icon={<Clock size={16} color={textMuted} />}
            label="Last login"
            value={user?.last_sign_in_at ? timeAgo(user.last_sign_in_at) : "—"}
            textPrimary={textPrimary}
            textMuted={textMuted}
          />
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionLabel, { color: textMuted, marginTop: 8 }]}>Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsRow}
        >
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedIds.includes(a.id);
            return (
              <View
                key={a.id}
                style={[
                  styles.achievementBadge,
                  { backgroundColor: card },
                  !unlocked && styles.achievementLocked,
                ]}
              >
                {unlocked ? (
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                ) : (
                  <Lock size={28} color="#9ca3af" />
                )}
                <Text
                  style={[styles.achievementTitle, { color: unlocked ? textPrimary : textMuted }]}
                  numberOfLines={2}
                >
                  {a.title}
                </Text>
                <Text style={[styles.achievementDesc, { color: textMuted }]} numberOfLines={2}>
                  {a.description}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Account actions */}
        <View style={[styles.divider, { backgroundColor: divider, marginTop: 8 }]} />

        <Pressable
          style={[styles.signOutBtn, signingOut && { opacity: 0.6 }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatRow({
  icon, label, value, sub, textPrimary, textMuted,
}: {
  icon: React.ReactElement;
  label: string;
  value: string | null;
  sub?: string;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowIcon}>{icon}</View>
      <Text style={[styles.statRowLabel, { color: textMuted }]}>{label}</Text>
      <View style={styles.statRowRight}>
        {value === null ? (
          <ActivityIndicator size="small" color={textMuted} />
        ) : (
          <Text style={[styles.statRowValue, { color: textPrimary }]}>{value}</Text>
        )}
        {sub ? <Text style={[styles.statRowSub, { color: textMuted }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 16,
  },

  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: "rgba(255,255,255,0.4)" },
  avatarPlaceholder: { backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 28, fontWeight: "700" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  avatarEditIcon: {},

  headerInfo: { flex: 1 },

  displayName: { color: "#fff", fontSize: 18, fontWeight: "800" },

  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cityText: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  cityEditRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cityInput: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 13,
  },
  citySaveBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  citySaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  memberSince: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 4 },

  followCountsRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 0 },
  followCountItem: { alignItems: "center", paddingRight: 16 },
  followCountNumber: { color: "#fff", fontSize: 16, fontWeight: "800" },
  followCountLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 },
  followCountDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.3)", marginRight: 16 },

  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },

  statCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  statDivider: { height: StyleSheet.hairlineWidth },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  statRowIcon: { width: 26, alignItems: "center" },
  statRowLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  statRowRight: { alignItems: "flex-end" },
  statRowValue: { fontSize: 14, fontWeight: "700" },
  statRowSub: { fontSize: 11, marginTop: 1 },

  achievementsRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 2,
  },
  achievementBadge: {
    width: 110,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  achievementLocked: { opacity: 0.45 },
  achievementIcon: { fontSize: 28, marginBottom: 4 },
  achievementIconLocked: { opacity: 0.6 },
  achievementTitle: { fontSize: 11, fontWeight: "700", textAlign: "center", marginBottom: 2 },
  achievementDesc: { fontSize: 10, textAlign: "center" },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },

  signOutBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
  signOutText: { color: "#fff", fontWeight: "700", fontSize: 15 },

});
