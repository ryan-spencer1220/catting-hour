import { useColorScheme } from "@/hooks/use-color-scheme";
import { addCheckin, deleteCheckin, fetchCheckins, type Checkin } from "@/lib/checkins";
import { deleteCat, fetchCatById } from "@/lib/cats";
import { addCatPhoto, deleteCatPhoto, fetchCatPhotos, type CatPhoto } from "@/lib/photos";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE = "#a78bfa";
const IMAGE_HEIGHT = 300;

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
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
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

  const [photos, setPhotos] = useState<CatPhoto[]>([]);
  const [photosReady, setPhotosReady] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const photoScrollRef = useRef<ScrollView>(null);

  const [locationName, setLocationName] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load cat and current user in parallel
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchCatById(id),
      supabase.auth.getSession(),
    ]).then(([result, { data: sessionData }]) => {
      if (!mounted) return;
      setCat(result);
      setCurrentUserId(sessionData.session?.user?.id ?? null);
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
      .then((records) => {
        if (!mounted) return;
        setPhotos(records);
        setPhotosReady(true);
      })
      .catch(() => { if (mounted) setPhotosReady(true); });
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
      setPhotos((prev) => {
        const next = [...prev, photo];
        setActivePhotoIndex(next.length - 1);
        return next;
      });
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

  function scrollToPhoto(index: number) {
    photoScrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    setActivePhotoIndex(index);
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
            setPhotos((prev) => {
              const next = prev.filter((p) => p.id !== photo.id);
              setActivePhotoIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
              return next;
            });
          } catch (e: any) {
            Alert.alert("Failed to delete photo", e?.message || String(e));
          }
        },
      },
    ]);
  }

  async function handleAddCheckin() {
    if (!newNote.trim()) return;
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
    Alert.alert("Remove check-in", "Delete this check-in?", [
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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={dark ? PURPLE : "#111827"} />
      </View>
    );
  }

  if (!cat) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={{ color: textPrimary, fontSize: 16 }}>Cat not found</Text>
      </View>
    );
  }

  // Build the photo URL list — prefer cat_photos table, fall back to cats.image
  const photoUrls: string[] = photos.length > 0
    ? photos.map((p) => p.url)
    : cat.image ? [cat.image] : [];

  const showDots = photoUrls.length > 1;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Photo gallery ── */}
        <View style={[styles.imageContainer, { width: screenWidth }]}>
          {photoUrls.length > 0 ? (
            <ScrollView
              ref={photoScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) =>
                setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))
              }
            >
              {photoUrls.map((url, i) => (
                <Pressable
                  key={i}
                  style={{ width: screenWidth, height: IMAGE_HEIGHT }}
                  onLongPress={() => photos[i] && handleDeletePhoto(photos[i])}
                >
                  <Image source={{ uri: url }} style={{ width: screenWidth, height: IMAGE_HEIGHT }} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.placeholder, { backgroundColor: dark ? "#1a2535" : "#f3f4f6" }]}>
              <Text style={styles.placeholderEmoji}>🐾</Text>
              <Text style={[styles.placeholderLabel, { color: textMuted }]}>No photos yet</Text>
            </View>
          )}

          {/* Swipe arrows */}
          {showDots && activePhotoIndex > 0 && (
            <Pressable
              style={[styles.swipeArrow, styles.swipeArrowLeft]}
              onPress={() => scrollToPhoto(activePhotoIndex - 1)}
            >
              <Text style={styles.swipeArrowText}>‹</Text>
            </Pressable>
          )}
          {showDots && activePhotoIndex < photoUrls.length - 1 && (
            <Pressable
              style={[styles.swipeArrow, styles.swipeArrowRight]}
              onPress={() => scrollToPhoto(activePhotoIndex + 1)}
            >
              <Text style={styles.swipeArrowText}>›</Text>
            </Pressable>
          )}

          {/* Dots */}
          {showDots && (
            <View style={styles.dots}>
              {photoUrls.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, { opacity: i === activePhotoIndex ? 1 : 0.35 }]}
                />
              ))}
            </View>
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
        </View>

        {/* ── Content card ── */}
        <View style={[styles.card, { backgroundColor: bg }]}>

          <Text style={[styles.name, { color: textPrimary }]}>{cat.name}</Text>
          {cat.ownerName ? (
            <Pressable
              onPress={() => cat.owner && router.push(`/users/${cat.owner}`)}
              disabled={!cat.owner}
            >
              <Text style={[styles.addedBy, { color: textMuted }, cat.owner && styles.addedByTappable]}>
                Added by {cat.ownerName}
              </Text>
            </Pressable>
          ) : null}

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
              <Text style={[styles.badgeText, { color: dark ? PURPLE : "#6d28d9" }]}>
                {cat.indoor ? "Indoor" : "Outdoor"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <View style={styles.detailList}>
            {cat.type ? <DetailRow label="Type" value={cat.type} dark={dark} /> : null}
            {cat.temperament ? <DetailRow label="Temperament" value={cat.temperament} dark={dark} /> : null}
            <DetailRow label="Environment" value={cat.indoor ? "Indoor" : "Outdoor"} dark={dark} />
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

          {cat.notes ? (
            <>
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />
              <Text style={[styles.sectionLabel, { color: textMuted }]}>Notes</Text>
              <Text style={[styles.notesText, { color: dark ? "#d1d5db" : "#374151" }]}>{cat.notes}</Text>
            </>
          ) : null}

          {/* ── Check-ins ── */}
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <Text style={[styles.sectionLabel, { color: textMuted }]}>Check-ins</Text>

          <View style={styles.addRow}>
            <TextInput
              style={[styles.checkinInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
              placeholder="Saw Ringo playing in the sun…"
              placeholderTextColor={textMuted}
              value={newNote}
              onChangeText={setNewNote}
              multiline
              maxLength={300}
            />
            <Pressable
              style={[
                styles.postBtn,
                { backgroundColor: dark ? PURPLE : "#111827" },
                (!newNote.trim() || submitting) && { opacity: 0.4 },
              ]}
              onPress={handleAddCheckin}
              disabled={!newNote.trim() || submitting}
            >
              <Text style={styles.postBtnText}>{submitting ? "…" : "Post"}</Text>
            </Pressable>
          </View>

          {checkinsLoading ? (
            <ActivityIndicator size="small" color={dark ? PURPLE : "#111827"} style={{ marginTop: 16 }} />
          ) : checkins.length === 0 ? (
            <Text style={[styles.emptyCheckins, { color: textMuted }]}>No check-ins yet — be the first!</Text>
          ) : (
            checkins.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.checkinItem, { backgroundColor: inputBg, borderColor: inputBorder }]}
                onLongPress={() => handleDeleteCheckin(c.id)}
              >
                <Text style={[styles.checkinNote, { color: textPrimary }]}>{c.note}</Text>
                <Text style={[styles.checkinTime, { color: textMuted }]}>
                  {c.authorName ? `${c.authorName} · ` : ""}{timeAgo(c.createdAt)}
                </Text>
              </Pressable>
            ))
          )}

          {/* Actions */}
          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable
              style={[styles.editBtn, { borderColor: dark ? PURPLE : "#111827" }]}
              onPress={() => router.push(`/cats/edit/${id}`)}
            >
              <Text style={[styles.editBtnText, { color: dark ? PURPLE : "#111827" }]}>Edit</Text>
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
          </View>

        </View>
      </ScrollView>

      {/* Back button — fixed over hero */}
      <Pressable style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>‹</Text>
      </Pressable>
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

  imageContainer: { height: IMAGE_HEIGHT },
  placeholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  placeholderEmoji: { fontSize: 72 },
  placeholderLabel: { marginTop: 8, fontSize: 14 },

  dots: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },

  swipeArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 8,
  },
  swipeArrowLeft: { left: 10 },
  swipeArrowRight: { right: 10 },
  swipeArrowText: { color: "#fff", fontSize: 26, lineHeight: 30, fontWeight: "300" },

  addPhotoBtn: {
    position: "absolute",
    bottom: 44,
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
  backBtnText: { color: "#fff", fontSize: 26, lineHeight: 30, marginTop: -2 },

  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: 24, paddingTop: 28 },

  name: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  addedBy: { fontSize: 13, marginTop: 4, marginBottom: 2 },
  addedByTappable: { color: "#a78bfa", textDecorationLine: "underline" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: "600" },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },

  detailList: { gap: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 14, fontWeight: "500" },
  detailValue: { fontSize: 15, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 16 },

  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  notesText: { fontSize: 15, lineHeight: 23 },

  addRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  checkinInput: {
    flex: 1, borderWidth: 1, borderRadius: 10, padding: 10,
    fontSize: 14, minHeight: 44, maxHeight: 100,
  },
  postBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyCheckins: { fontSize: 14, marginTop: 4, marginBottom: 8 },
  checkinItem: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  checkinNote: { fontSize: 14, lineHeight: 20 },
  checkinTime: { fontSize: 12, marginTop: 4 },

  actions: { flexDirection: "row", gap: 12, marginTop: 32 },
  editBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  editBtnText: { fontWeight: "700", fontSize: 15 },
  deleteBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#dc2626", alignItems: "center" },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
