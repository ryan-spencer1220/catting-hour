import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllCats, type Cat, uploadImage } from "@/lib/cats";
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
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { FadeImage } from "@/components/fade-image";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Lock, MapPin, PawPrint, Pencil } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GRID_GAP = 3;

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const bg = dark ? "#0f1720" : "#f0f0f0";
  const card = dark ? "#1a2535" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#6b7280" : "#9ca3af";
  const divider = dark ? "#1e2d3d" : "#e5e7eb";

  const cardWidth = (screenWidth - GRID_GAP) / 2;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myCats, setMyCats] = useState<Cat[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [totalCheckins, setTotalCheckins] = useState<number | null>(null);
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
        try {
          const { data } = await supabase.auth.getUser();
          const u = data?.user ?? null;
          if (!mounted) return;
          if (!u) { router.replace("/"); return; }
          setUser(u);

          const userId = u.id;

          const [counts, allCats, { count: checkinCount }] = await Promise.all([
            fetchFollowCounts(userId),
            fetchAllCats(),
            supabase.from("checkins").select("*", { count: "exact", head: true }).eq("author", userId),
          ]);

          if (!mounted) return;
          setFollowCounts(counts);
          setMyCats(allCats.filter((c) => c.owner === userId));
          setTotalCheckins(checkinCount ?? 0);
          setCatsLoading(false);

          await checkAndUnlockFollowerAchievements(counts.followers);
        } catch {
          if (mounted) router.replace("/");
        } finally {
          if (mounted) setLoading(false);
        }
      }

      getUnlockedAchievements().then((ids) => { if (mounted) setUnlockedIds(ids); });
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

  async function saveUsername() {
    const trimmed = usernameDraft.trim();
    if (!trimmed) { Alert.alert("Required", "Username cannot be empty."); return; }
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
      Alert.alert("Failed to save", msg.includes("unique") ? "That username is already taken." : msg);
    } finally {
      setSavingUsername(false);
    }
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try { await supabaseSignOut(); }
          catch (e: any) { Alert.alert("Sign out failed", e?.message || String(e)); }
          finally { setSigningOut(false); }
        },
      },
    ]);
  }

  const displayName = user?.user_metadata?.username ?? "";
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const city = user?.user_metadata?.city ?? null;
  const initials = displayName.slice(0, 2).toUpperCase() || "?";

  const inputBg = dark ? "#0f1720" : "#f9fafb";
  const inputBorder = dark ? "#374151" : "#e5e7eb";

  const ListHeader = (
    <View>
      {/* ── Hero header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: accent }]}>
        {/* Decorative paw prints */}
        <View pointerEvents="none" style={styles.pawTL}>
          <PawPrint size={80} color="rgba(255,255,255,0.09)" />
        </View>
        <View pointerEvents="none" style={styles.pawTR}>
          <PawPrint size={52} color="rgba(255,255,255,0.07)" />
        </View>
        <View pointerEvents="none" style={styles.pawBR}>
          <PawPrint size={96} color="rgba(255,255,255,0.055)" />
        </View>

        {/* Avatar */}
        <Pressable style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {/* Ring wrapper — no overflow:hidden so border stays round */}
          <View style={styles.avatarRing}>
            {/* Clip wrapper — overflow:hidden crops the image to a circle */}
            <View style={styles.avatarClip}>
              {uploadingAvatar ? (
                <View style={styles.avatarInner}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : avatarUrl ? (
                <FadeImage uri={avatarUrl} style={styles.avatarInner} />
              ) : (
                <View style={[styles.avatarInner, styles.avatarPlaceholder]}>
                  {loading
                    ? <ActivityIndicator color="rgba(255,255,255,0.6)" />
                    : <Text style={styles.initials}>{initials}</Text>
                  }
                </View>
              )}
            </View>
          </View>
          <View style={[styles.avatarEditBadge, { borderColor: accent }]}>
            <Pencil size={11} color={accent} />
          </View>
        </Pressable>

        {/* Username */}
        {editingUsername ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
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
            <Pressable style={styles.editSaveBtn} onPress={saveUsername} disabled={savingUsername}>
              <Text style={styles.editSaveBtnText}>{savingUsername ? "…" : "Save"}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { setUsernameDraft(user?.user_metadata?.username ?? ""); setEditingUsername(true); }}>
            <Text style={styles.displayName}>{displayName || "Tap to set username"}</Text>
          </Pressable>
        )}

        {/* City */}
        {editingCity ? (
          <View style={[styles.editRow, { marginTop: 6 }]}>
            <TextInput
              style={[styles.editInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
              value={cityDraft}
              onChangeText={setCityDraft}
              placeholder="Your city"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveCity}
            />
            <Pressable style={styles.editSaveBtn} onPress={saveCity} disabled={savingCity}>
              <Text style={styles.editSaveBtnText}>{savingCity ? "…" : "Save"}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.cityRow}
            onPress={() => { setCityDraft(user?.user_metadata?.city ?? ""); setEditingCity(true); }}
          >
            <MapPin size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cityText}>{city ?? "Add location"}</Text>
          </Pressable>
        )}

        {/* Stats pills */}
        <View style={styles.countsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{followCounts.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{followCounts.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{catsLoading ? "—" : myCats.length}</Text>
            <Text style={styles.statLabel}>Cats</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{totalCheckins ?? "—"}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </View>
      </View>

      {/* ── Achievements ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={[styles.sectionLabel, { color: textMuted }]}>Achievements</Text>
      </View>
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
                { backgroundColor: unlocked ? (dark ? "#1a2535" : "#fff") : (dark ? "#1a2535" : "#fff") },
                !unlocked && styles.achievementLocked,
              ]}
            >
              {unlocked ? (
                <View style={[styles.achievementIconWrap, { backgroundColor: accent + "22" }]}>
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                </View>
              ) : (
                <View style={[styles.achievementIconWrap, { backgroundColor: dark ? "#2d3f55" : "#f3f4f6" }]}>
                  <Lock size={22} color="#9ca3af" />
                </View>
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

      {/* ── Cat grid header ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }}>
        <Text style={[styles.sectionLabel, { color: textMuted }]}>
          {catsLoading ? "Your cats" : `Your cats (${myCats.length})`}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      style={[styles.screen, { backgroundColor: bg }]}
      data={catsLoading ? [] : myCats}
      keyExtractor={(c) => c.id}
      numColumns={2}
      columnWrapperStyle={{ gap: GRID_GAP, paddingHorizontal: 0 }}
      ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        catsLoading ? (
          <View style={{ flexDirection: "row", gap: GRID_GAP, paddingHorizontal: 0 }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} style={{ width: cardWidth, height: cardWidth, borderRadius: 0 }} />
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
            <EmptyState
              icon={<PawPrint size={36} color={accent} />}
              title="No cats yet"
              body="You haven't logged any cats. Get out there and find some!"
            />
          </View>
        )
      }
      ListFooterComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>
          <View style={[styles.divider, { backgroundColor: divider }]} />
          <Pressable
            style={[styles.signOutBtn, signingOut && { opacity: 0.6 }]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
          </Pressable>
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
            <View style={[styles.gridPlaceholder, { width: cardWidth, height: cardWidth, backgroundColor: accent + "55" }]}>
              <PawPrint size={40} color="rgba(255,255,255,0.45)" />
            </View>
          )}
          <View style={styles.gridScrim} />
          <View style={styles.gridOverlay}>
            <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
            {item.type ? <Text style={styles.gridMeta} numberOfLines={1}>{item.type}</Text> : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },

  pawTL: { position: "absolute", top: 8, left: -18 },
  pawTR: { position: "absolute", top: 52, right: -10 },
  pawBR: { position: "absolute", bottom: -24, right: 16 },

  avatarWrap: { position: "relative", marginBottom: 12 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
    padding: 0,
  },
  avatarClip: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
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
  initials: { color: "#fff", fontSize: 32, fontWeight: "700" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },

  displayName: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  cityText: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  editRow: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    color: "#fff",
  },
  editSaveBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editSaveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  countsRow: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" },
  statPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 68,
  },
  statNumber: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "600", marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  achievementsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  achievementBadge: {
    width: 110,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementLocked: { opacity: 0.45 },
  achievementIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  achievementIcon: { fontSize: 26 },
  achievementTitle: { fontSize: 11, fontWeight: "700", textAlign: "center", marginBottom: 3 },
  achievementDesc: { fontSize: 10, textAlign: "center" },

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

  divider: { height: StyleSheet.hairlineWidth },
  signOutBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
  signOutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
