import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { addCheckin, deleteCheckin, fetchCheckins, type Checkin } from "@/lib/checkins";
import { deleteCat, fetchCatById, suggestCatName } from "@/lib/cats";
import { fetchLikes, likeCat, unlikeCat } from "@/lib/likes";
import { addCatPhoto, deleteCatPhoto, fetchCatPhotos, type CatPhoto } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Heart, PawPrint, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { FadeImage } from "@/components/fade-image";
import { Skeleton } from "@/components/skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";


function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    + " at "
    + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function CatDetail() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ?? "";
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Shorter hero so it can stay pinned above the tabbed content.
  const IMAGE_HEIGHT = Math.round(screenHeight * 0.34);
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();

  const bg = dark ? "#0f1720" : "#fff";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#6b7280" : "#9ca3af";
  const dividerColor = dark ? "#1e2d3d" : "#e5e7eb";
  const badgeBg = dark ? "#1a2535" : "#f3f4f6";
  const badgeText = dark ? "#d1d5db" : "#374151";
  const inputBg = dark ? "#1a2535" : "#f9fafb";
  const inputBorder = dark ? "#374151" : "#e5e7eb";

  const [cat, setCat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [photos, setPhotos] = useState<CatPhoto[]>([]);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);

  const [locationName, setLocationName] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nameSuggestion, setNameSuggestion] = useState("");
  const [submittingName, setSubmittingName] = useState(false);

  // Tabbed content (Details / Comments) — tap the segmented control or swipe.
  const [activeTab, setActiveTab] = useState(0);
  const [pagerH, setPagerH] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  function goToTab(index: number) {
    setActiveTab(index);
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  }

  // Load cat and current user in parallel
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchCatById(id),
      supabase.auth.getSession(),
      fetchLikes(id),
    ]).then(([result, { data: sessionData }, likes]) => {
      if (!mounted) return;
      setCat(result);
      setCurrentUserId(sessionData.session?.user?.id ?? null);
      setLikeCount(likes.count);
      setLiked(likes.likedByUser);
    }).catch(() => {
      if (mounted) setCat(null);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  // Load photos — fall back to cats.image if table is empty
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    fetchCatPhotos(id)
      .then((records) => { if (mounted) setPhotos(records); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [id]);

  // Reverse geocode
  useEffect(() => {
    if (!cat?.lat || !cat?.lng) return;
    let mounted = true;
    Location.reverseGeocodeAsync({ latitude: cat.lat, longitude: cat.lng })
      .then((results) => {
        if (!mounted || results.length === 0) return;
        const { city, region } = results[0];
        const label = [city, region].filter(Boolean).join(", ");
        setLocationName(label || null);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [cat?.lat, cat?.lng]);

  async function handleSuggestName() {
    if (!nameSuggestion.trim()) return;
    setSubmittingName(true);
    try {
      await suggestCatName(id, nameSuggestion.trim());
      setCat((prev: any) => prev ? { ...prev, name: nameSuggestion.trim(), nameUnknown: false } : prev);
      setNameSuggestion("");
    } catch (e: any) {
      Alert.alert("Failed to save", e?.message || String(e));
    } finally {
      setSubmittingName(false);
    }
  }

  // Load check-ins
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    fetchCheckins(id)
      .then((rows) => { if (mounted) setCheckins(rows); })
      .catch(() => {})
      .finally(() => { if (mounted) setCheckinsLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  async function uploadPhoto(uri: string) {
    setAddingPhoto(true);
    try {
      const photo = await addCatPhoto(id, uri);
      setPhotos((prev) => [...prev, photo]);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || String(e));
    } finally {
      setAddingPhoto(false);
    }
  }

  async function openCamera() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Camera access is needed to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri;
        if (uri) await uploadPhoto(uri);
      }
    } catch (e: any) {
      Alert.alert("Camera error", e?.message || String(e));
    }
  }

  async function openLibrary() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Photo library access is needed to add a photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri;
        if (uri) await uploadPhoto(uri);
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || String(e));
    }
  }



  function handleAddPhoto() {
    Alert.alert("Add photo", "Choose a source", [
      { text: "Take photo", onPress: () => setTimeout(openCamera, 300) },
      { text: "Choose from library", onPress: () => setTimeout(openLibrary, 300) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleDeletePhoto(photo: CatPhoto) {
    Alert.alert("Remove photo", "Delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCatPhoto(photo.id);
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          } catch (e: any) {
            Alert.alert("Failed to delete photo", e?.message || String(e));
          }
        },
      },
    ]);
  }

  async function handleAddCheckin() {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      Alert.alert("Too long", "Comments must be 500 characters or fewer.");
      return;
    }
    setSubmitting(true);
    try {
      const checkin = await addCheckin(id, newNote);
      setCheckins((prev) => [checkin, ...prev]);
      setNewNote("");
    } catch (e: any) {
      Alert.alert("Failed to post", e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteCheckin(checkinId: string) {
    Alert.alert("Delete comment", "Delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCheckin(checkinId);
            setCheckins((prev) => prev.filter((c) => c.id !== checkinId));
          } catch (e: any) {
            Alert.alert("Failed to delete", e?.message || String(e));
          }
        },
      },
    ]);
  }

  async function handleToggleLike() {
    if (likeLoading) return;
    setLikeLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      if (wasLiked) await unlikeCat(id);
      else await likeCat(id);
    } catch (e: any) {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
      Alert.alert("Error", e?.message || String(e));
    } finally {
      setLikeLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: bg }]}>
        <Skeleton style={{ width: screenWidth, height: IMAGE_HEIGHT }} radius={0} />
        <View style={[styles.card, { backgroundColor: bg }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <Skeleton style={{ height: 38, flex: 1 }} radius={6} />
            <Skeleton style={{ width: 36, height: 36, borderRadius: 18 }} />
          </View>
          <Skeleton style={{ height: 14, width: "38%", marginTop: 10 }} />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
            <Skeleton style={{ height: 28, width: 72 }} radius={20} />
            <Skeleton style={{ height: 28, width: 88 }} radius={20} />
            <Skeleton style={{ height: 28, width: 66 }} radius={20} />
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor, marginTop: 28 }]} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 18 }}>
              <Skeleton style={{ height: 14, width: "28%" }} />
              <Skeleton style={{ height: 14, width: "38%" }} />
            </View>
          ))}
        </View>
        <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </Pressable>
      </View>
    );
  }

  if (!cat) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </Pressable>
        <Text style={{ color: textPrimary, fontSize: 16 }}>Cat not found</Text>
      </View>
    );
  }

  // Build the photo URL list — prefer cat_photos table, fall back to cats.image
  const photoUrls: string[] = photos.length > 0
    ? photos.map((p) => p.url)
    : cat.image ? [cat.image] : [];

  const environment = cat.indoor === null ? "Indoor & Outdoor" : cat.indoor ? "Indoor" : "Outdoor";
  const tabs = ["Details", `Comments${checkins.length > 0 ? ` (${checkins.length})` : ""}`];

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Pinned hero (swipe through photos) ── */}
      <View style={{ height: IMAGE_HEIGHT }}>
        {photoUrls.length === 0 ? (
          <View style={[styles.placeholder, { backgroundColor: dark ? "#1a2535" : "#f3f4f6" }]}>
            <PawPrint size={52} color={dark ? "#4b5563" : "#d1d5db"} />
            <Text style={[styles.placeholderLabel, { color: textMuted }]}>No photos yet</Text>
            <Text style={[styles.placeholderSub, { color: textMuted }]}>Tap + Photo to add one</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
          >
            {photoUrls.map((url, i) => (
              <Pressable
                key={i}
                style={{ width: screenWidth, height: IMAGE_HEIGHT }}
                onPress={() => { setLightboxIndex(i); setLightboxVisible(true); }}
                onLongPress={() => photos[i] && handleDeletePhoto(photos[i])}
              >
                <FadeImage uri={url} style={{ width: screenWidth, height: IMAGE_HEIGHT }} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Add photo button */}
        <Pressable
          style={[styles.addPhotoBtn, addingPhoto && { opacity: 0.6 }]}
          onPress={handleAddPhoto}
          disabled={addingPhoto}
        >
          {addingPhoto
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.addPhotoBtnText}>+ Photo</Text>
          }
        </Pressable>

        {/* Photo dots */}
        {photoUrls.length > 1 && (
          <View style={styles.heroDots}>
            {photoUrls.map((_, i) => (
              <View
                key={i}
                style={[styles.heroDot, { backgroundColor: i === heroIndex ? "#fff" : "rgba(255,255,255,0.45)" }]}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── Pinned identity (name + like, always visible) ── */}
      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={[styles.name, { color: textPrimary }]} numberOfLines={2}>{cat.name}</Text>
            {cat.nameUnknown && (
              <View style={[styles.unknownBadge, { backgroundColor: dark ? "#2d3f55" : "#f3f4f6" }]}>
                <Text style={[styles.unknownBadgeText, { color: textMuted }]}>name unknown</Text>
              </View>
            )}
          </View>
          <Pressable style={styles.likeBtn} onPress={handleToggleLike} disabled={likeLoading}>
            <Heart
              size={30}
              color={liked ? "#ef4444" : textMuted}
              fill={liked ? "#ef4444" : "none"}
            />
            {likeCount > 0 && (
              <Text style={[styles.likeCount, { color: liked ? "#ef4444" : textMuted }]}>
                {likeCount}
              </Text>
            )}
          </Pressable>
        </View>

        {cat.ownerName ? (
          <Pressable
            style={({ pressed }) => [
              styles.ownerChip,
              { backgroundColor: dark ? "#1a2535" : "#f3f4f6" },
              pressed && cat.owner && { opacity: 0.7 },
            ]}
            onPress={() => cat.owner && router.push(`/users/${cat.owner}`)}
            disabled={!cat.owner}
          >
            <View style={[styles.ownerAvatar, { backgroundColor: accent }]}>
              <Text style={styles.ownerAvatarText}>{(cat.ownerName ?? "?")[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.ownerChipLabel, { color: textMuted }]}>Added by</Text>
              <Text style={[styles.ownerChipName, { color: textPrimary }]} numberOfLines={1}>
                {cat.ownerName}
              </Text>
            </View>
            {cat.owner ? <ChevronRight size={18} color={textMuted} style={{ marginLeft: 2 }} /> : null}
          </Pressable>
        ) : null}
      </View>

      {/* ── Segmented tabs ── */}
      <View style={[styles.segmented, { borderBottomColor: dividerColor }]}>
        {tabs.map((label, i) => {
          const active = activeTab === i;
          return (
            <Pressable key={i} style={styles.segment} onPress={() => goToTab(i)}>
              <Text style={[styles.segmentText, { color: active ? textPrimary : textMuted }]}>{label}</Text>
              <View style={[styles.segmentUnderline, { backgroundColor: active ? accent : "transparent" }]} />
            </Pressable>
          );
        })}
      </View>

      {/* ── Swipeable pages ── */}
      <View style={{ flex: 1 }} onLayout={(e) => setPagerH(e.nativeEvent.layout.height)}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={(e) => setActiveTab(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
        >
          {/* ── Page 1: Details ── */}
          <View style={{ width: screenWidth, height: pagerH }}>
            <ScrollView
              contentContainerStyle={[styles.pageContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.badges}>
                {cat.type ? (
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeText }]}>{cat.type}</Text>
                  </View>
                ) : null}
                {cat.temperament ? (
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.badgeText, { color: badgeText }]}>{cat.temperament}</Text>
                  </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: dark ? "#2d1f4e" : "#ede9fe" }]}>
                  <Text style={[styles.badgeText, { color: dark ? accent : "#6d28d9" }]}>{environment}</Text>
                </View>
              </View>

              {cat.nameUnknown && currentUserId && (
                <View style={[styles.nameSuggestionCard, { backgroundColor: dark ? "#1a2535" : "#f9fafb", borderColor: dark ? "#2d3f55" : "#e5e7eb" }]}>
                  <Text style={[styles.nameSuggestionTitle, { color: textPrimary }]}>
                    Do you know this cat&apos;s name?
                  </Text>
                  <Text style={[styles.nameSuggestionSub, { color: textMuted }]}>
                    Help the community — share the real name if you know it.
                  </Text>
                  <View style={styles.nameSuggestionRow}>
                    <TextInput
                      style={[styles.nameSuggestionInput, { backgroundColor: dark ? "#0f1720" : "#fff", borderColor: dark ? "#374151" : "#e5e7eb", color: textPrimary }]}
                      placeholder="Their real name…"
                      placeholderTextColor={textMuted}
                      value={nameSuggestion}
                      onChangeText={setNameSuggestion}
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSuggestName}
                    />
                    <Pressable
                      style={[styles.nameSuggestionBtn, { backgroundColor: accent }, (!nameSuggestion.trim() || submittingName) && { opacity: 0.5 }]}
                      onPress={handleSuggestName}
                      disabled={!nameSuggestion.trim() || submittingName}
                    >
                      <Text style={styles.nameSuggestionBtnText}>{submittingName ? "…" : "Save"}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={styles.detailList}>
                {cat.type ? <DetailRow label="Type" value={cat.type} dark={dark} /> : null}
                {cat.temperament ? <DetailRow label="Temperament" value={cat.temperament} dark={dark} /> : null}
                <DetailRow label="Environment" value={environment} dark={dark} />
                {cat.lat != null && cat.lng != null ? (
                  <DetailRow
                    label="Location"
                    value={locationName ?? `${Number(cat.lat).toFixed(4)}, ${Number(cat.lng).toFixed(4)}`}
                    dark={dark}
                  />
                ) : null}
                {cat.createdAt ? (
                  <DetailRow
                    label="Added"
                    value={(() => {
                      const d = new Date(cat.createdAt);
                      return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                        + " at "
                        + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                    })()}
                    dark={dark}
                  />
                ) : null}
              </View>

              {/* Manage actions */}
              <View style={styles.actions}>
                <Pressable
                  style={[styles.editBtn, { borderColor: dark ? accent : "#111827" }]}
                  onPress={() => router.push(`/cats/edit/${id}`)}
                >
                  <Text style={[styles.editBtnText, { color: dark ? accent : "#111827" }]}>Edit</Text>
                </Pressable>

                {currentUserId && cat?.owner === currentUserId && (
                  <Pressable
                    style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
                    disabled={deleting}
                    onPress={() =>
                      Alert.alert("Delete cat", "Are you sure? This cannot be undone.", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            setDeleting(true);
                            try {
                              await deleteCat(id);
                              router.back();
                            } catch (e: any) {
                              Alert.alert("Delete failed", e?.message || String(e));
                            } finally {
                              setDeleting(false);
                            }
                          },
                        },
                      ])
                    }
                  >
                    <Text style={styles.deleteBtnText}>{deleting ? "Deleting…" : "Delete"}</Text>
                  </Pressable>
                )}

                {currentUserId && cat?.owner !== currentUserId && (
                  <Pressable
                    style={styles.reportBtn}
                    onPress={() =>
                      Alert.alert("Report content", "Is something wrong with this listing?", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Report",
                          style: "destructive",
                          onPress: () => {
                            const subject = encodeURIComponent(`Report: ${cat?.name ?? "Cat"} (ID: ${id})`);
                            const body = encodeURIComponent(`Please describe the issue:\n\n`);
                            Linking.openURL(`mailto:ryan.spencer1220@gmail.com?subject=${subject}&body=${body}`);
                          },
                        },
                      ])
                    }
                  >
                    <Text style={styles.reportBtnText}>Report</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>

          {/* ── Page 2: Comments ── */}
          <View style={{ width: screenWidth, height: pagerH }}>
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Finder's note — the original note left by whoever added the cat */}
                {cat.notes ? (
                  <View style={[styles.commentRow, styles.finderNote, { backgroundColor: dark ? "#1a2535" : "#f9fafb" }]}>
                    <View style={[styles.commentAvatar, { backgroundColor: accent }]}>
                      <Text style={styles.commentAvatarText}>
                        {(cat.ownerName ?? "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.finderNoteHeader}>
                        <Text style={[styles.commentAuthor, { color: textPrimary }]}>
                          {cat.ownerName ?? "Cat finder"}
                        </Text>
                        <View style={[styles.finderBadge, { backgroundColor: accent }]}>
                          <Text style={styles.finderBadgeText}>Finder</Text>
                        </View>
                      </View>
                      <Text style={[styles.commentText, { color: textPrimary }]}>{cat.notes}</Text>
                    </View>
                  </View>
                ) : null}

                {checkinsLoading ? (
                  <ActivityIndicator size="small" color={dark ? accent : "#111827"} style={{ marginTop: 16 }} />
                ) : (
                  checkins.map((c) => {
                    const mine = !!currentUserId && c.authorId === currentUserId;
                    return (
                      <Pressable
                        key={c.id}
                        style={styles.commentRow}
                        onLongPress={mine ? () => handleDeleteCheckin(c.id) : undefined}
                      >
                        <View style={[styles.commentAvatar, { backgroundColor: accent }]}>
                          <Text style={styles.commentAvatarText}>
                            {(c.authorName ?? "?")[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.commentText, { color: textPrimary }]}>
                            <Text style={styles.commentAuthor}>{c.authorName ?? "Anonymous"} </Text>
                            {c.note}
                          </Text>
                          <Text style={[styles.commentTime, { color: textMuted }]}>{timeAgo(c.createdAt)}</Text>
                        </View>
                        {mine && (
                          <Pressable
                            style={styles.commentDelete}
                            onPress={() => handleDeleteCheckin(c.id)}
                            hitSlop={8}
                            accessibilityLabel="Delete comment"
                          >
                            <Trash2 size={15} color={textMuted} />
                          </Pressable>
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {/* Comment input bar — pinned to the bottom of the Comments page */}
              <View style={[styles.commentBar, { backgroundColor: bg, borderTopColor: inputBorder, paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  style={[styles.commentBarInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                  placeholder="Add a comment…"
                  placeholderTextColor={textMuted}
                  value={newNote}
                  onChangeText={setNewNote}
                  maxLength={300}
                  returnKeyType="send"
                  onSubmitEditing={handleAddCheckin}
                  blurOnSubmit={false}
                />
                <Pressable
                  style={[styles.commentBarPost, { backgroundColor: accent }, (!newNote.trim() || submitting) && { opacity: 0.4 }]}
                  onPress={handleAddCheckin}
                  disabled={!newNote.trim() || submitting}
                >
                  <Text style={styles.commentBarPostText}>{submitting ? "…" : "Post"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Back button — fixed over hero */}
      <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <ChevronLeft size={28} color="#fff" />
      </Pressable>

      {/* ── Lightbox ── */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightboxVisible(false)}
        onShow={() => {
          if (lightboxIndex > 0) {
            lightboxScrollRef.current?.scrollTo({ x: lightboxIndex * screenWidth, animated: false });
          }
        }}
      >
        <StatusBar hidden />
        <View style={styles.lightboxBg}>
          <ScrollView
            ref={lightboxScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              setLightboxIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth));
            }}
          >
            {photoUrls.map((url, i) => (
              <View key={i} style={{ width: screenWidth, height: "100%", justifyContent: "center" }}>
                <Image
                  source={{ uri: url }}
                  style={{ width: screenWidth, height: "100%" }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Close */}
          <Pressable
            style={[styles.lightboxClose, { top: insets.top + 12 }]}
            onPress={() => setLightboxVisible(false)}
            hitSlop={12}
          >
            <Text style={styles.lightboxCloseText}>✕</Text>
          </Pressable>

          {/* Page counter */}
          {photoUrls.length > 1 && (
            <View style={[styles.lightboxCounter, { bottom: insets.bottom + 24 }]}>
              <Text style={styles.lightboxCounterText}>
                {lightboxIndex + 1} / {photoUrls.length}
              </Text>
            </View>
          )}

          {/* Prev arrow */}
          {lightboxIndex > 0 && (
            <Pressable
              style={[styles.lightboxArrow, styles.lightboxArrowLeft]}
              onPress={() => {
                const next = lightboxIndex - 1;
                lightboxScrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
                setLightboxIndex(next);
              }}
            >
              <ChevronLeft size={28} color="#fff" />
            </Pressable>
          )}

          {/* Next arrow */}
          {lightboxIndex < photoUrls.length - 1 && (
            <Pressable
              style={[styles.lightboxArrow, styles.lightboxArrowRight]}
              onPress={() => {
                const next = lightboxIndex + 1;
                lightboxScrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
                setLightboxIndex(next);
              }}
            >
              <ChevronRight size={28} color="#fff" />
            </Pressable>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function DetailRow({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: dark ? "#6b7280" : "#9ca3af" }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: dark ? "#fff" : "#111827" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  imageContainer: {},
  placeholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  placeholderLabel: { marginTop: 8, fontSize: 14, fontWeight: "600" },
  placeholderSub: { fontSize: 12, marginTop: 4 },

  heroDots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },

  addPhotoBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  backBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  backBtnText: {},

  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: 24, paddingTop: 40 },

  identity: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  name: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  unknownBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  unknownBadgeText: { fontSize: 11, fontWeight: "600" },
  nameSuggestionCard: { marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  nameSuggestionTitle: { fontSize: 15, fontWeight: "700" },
  nameSuggestionSub: { fontSize: 13, lineHeight: 18 },
  nameSuggestionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  nameSuggestionInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  nameSuggestionBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  nameSuggestionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  ownerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  ownerAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ownerAvatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ownerChipLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  ownerChipName: { fontSize: 14, fontWeight: "700" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: "600" },

  segmented: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  segment: { flex: 1, alignItems: "center", paddingTop: 12 },
  segmentText: { fontSize: 14, fontWeight: "700" },
  segmentUnderline: { height: 2.5, alignSelf: "stretch", marginTop: 10, borderRadius: 2 },

  pageContent: { padding: 20 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  likeBtn: { alignItems: "center", paddingTop: 4, minWidth: 40 },
  likeCount: { fontSize: 13, fontWeight: "600", marginTop: 3 },

  detailList: { gap: 16, marginTop: 20 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 14, fontWeight: "500" },
  detailValue: { fontSize: 15, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 16 },

  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },

  finderNote: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  finderNoteHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  finderBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  finderBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  commentBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  commentBarInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  commentBarPost: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  commentBarPostText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  commentRow: { flexDirection: "row", gap: 10, paddingVertical: 8, alignItems: "flex-start" },
  commentDelete: { padding: 4, alignSelf: "flex-start" },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  commentAuthor: { fontWeight: "700" },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentTime: { fontSize: 11, marginTop: 3 },

  lightboxBg: { flex: 1, backgroundColor: "#000" },
  lightboxClose: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  lightboxCounter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  lightboxCounterText: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "600" },
  lightboxArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
  },
  lightboxArrowLeft: { left: 10 },
  lightboxArrowRight: { right: 10 },

  actions: { flexDirection: "row", gap: 12, marginTop: 32 },
  editBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  editBtnText: { fontWeight: "700", fontSize: 15 },
  deleteBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#dc2626", alignItems: "center" },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  reportBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  reportBtnText: { color: "#9ca3af", fontWeight: "600", fontSize: 14 },
});
