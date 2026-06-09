import { SelectField } from "@/components/select-field";
import { AchievementPopup } from "@/components/achievement-popup";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { createCat, uploadImage } from "@/lib/cats";
import { generateCatName } from "@/lib/cat-names";
import { checkAndUnlockAchievements, checkAndUnlockLocationAchievements, Achievement } from "@/lib/achievements";
import { useAccent } from "@/context/theme";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

const CAT_TYPES = [
  "Domestic Shorthair", "Domestic Longhair", "Tabby", "Calico", "Tuxedo",
  "Tortoiseshell", "Siamese", "Persian", "Maine Coon", "Ragdoll",
  "Bengal", "Sphynx", "Scottish Fold", "Unknown",
];

const CAT_TEMPERAMENTS = [
  "Friendly", "Shy", "Playful", "Affectionate", "Independent",
  "Curious", "Lazy", "Skittish", "Vocal", "Aggressive",
];

export default function CreateCat() {
  const params = useLocalSearchParams<{ lng?: string; lat?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const lng = parseFloat(params.lng ?? "0");
  const lat = parseFloat(params.lat ?? "0");

  const [name, setName] = useState("");
  const [nameUnknown, setNameUnknown] = useState(false);
  const [type, setType] = useState("Unknown");
  const [temperament, setTemperament] = useState("Friendly");
  const [indoor, setIndoor] = useState(true);
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [shownAchievement, setShownAchievement] = useState<Achievement | null>(null);

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
        if (uri) setImageUri(uri);
      }
    } catch (err) {
      console.warn("Camera error", err);
    }
  }

  async function openLibrary() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Photo library access is needed to add a picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri;
        if (uri) setImageUri(uri);
      }
    } catch (err) {
      console.warn("Image pick error", err);
    }
  }

  function pickImage() {
    Alert.alert("Add photo", "Choose a source", [
      { text: "Take photo", onPress: () => setTimeout(openCamera, 300) },
      { text: "Choose from library", onPress: () => setTimeout(openLibrary, 300) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function toggleNameUnknown() {
    if (!nameUnknown) {
      setName(generateCatName());
      setNameUnknown(true);
    } else {
      setName("");
      setNameUnknown(false);
    }
  }

  async function submit() {
    if (!nameUnknown && !name.trim()) {
      Alert.alert("Name required", "Give this cat a name, or tap \"I don't know their name\".");
      return;
    }
    const finalName = nameUnknown ? name || generateCatName() : name.trim();
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      let state: string | null = null;
      let country: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        state = geo?.region ?? null;
        country = geo?.country ?? null;
      } catch {}

      await createCat({ name: finalName, nameUnknown, type, temperament, indoor, notes, lat, lng, image: imageUrl, state, country });

      try {
        const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;
        if (userId) {
          const { count } = await supabase
            .from("cats")
            .select("*", { count: "exact", head: true })
            .eq("owner", userId);
          const [catAchievements, locationAchievements] = await Promise.all([
            checkAndUnlockAchievements(count ?? 0),
            checkAndUnlockLocationAchievements(userId),
          ]);
          const newAchievements = [...catAchievements, ...locationAchievements];
          if (newAchievements.length > 0) {
            setPendingAchievements(newAchievements.slice(1));
            setShownAchievement(newAchievements[0]);
            return;
          }
        }
      } catch {}

      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleAchievementDismiss() {
    if (pendingAchievements.length > 0) {
      const [next, ...rest] = pendingAchievements;
      setPendingAchievements(rest);
      setShownAchievement(next);
    } else {
      setShownAchievement(null);
      router.back();
    }
  }

  const inputStyle = [styles.input, dark && styles.inputDark];
  const labelStyle = [styles.label, dark && styles.labelDark];

  return (
    <>
    <AchievementPopup achievement={shownAchievement} onDismiss={handleAchievementDismiss} />
    <SafeAreaView style={[styles.safe, dark && styles.safeDark]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, dark && styles.headingDark]}>Add a cat</Text>

        <Text style={labelStyle}>Location</Text>
        <Text style={styles.value}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </Text>

        <Text style={labelStyle}>Name</Text>
        <TextInput
          style={[inputStyle, nameUnknown && styles.inputDisabled]}
          value={name}
          onChangeText={setName}
          placeholder="Cat name"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          editable={!nameUnknown}
        />
        {nameUnknown && (
          <Text style={[styles.generatedLabel, { color: dark ? "#6b7280" : "#9ca3af" }]}>
            Auto-generated — anyone can suggest the real name
          </Text>
        )}
        <Pressable style={styles.unknownToggle} onPress={toggleNameUnknown}>
          <View style={[styles.unknownCheckbox, nameUnknown && { backgroundColor: accent, borderColor: accent }]}>
            {nameUnknown && <Text style={styles.unknownCheckmark}>✓</Text>}
          </View>
          <Text style={[styles.unknownLabel, { color: dark ? "#d1d5db" : "#374151" }]}>
            I don&apos;t know their name
          </Text>
        </Pressable>

        <Text style={labelStyle}>Type</Text>
        <SelectField
          value={type}
          options={CAT_TYPES}
          onChange={setType}
          dark={dark}
          placeholder="Select type…"
        />

        <Text style={labelStyle}>Temperament</Text>
        <SelectField
          value={temperament}
          options={CAT_TEMPERAMENTS}
          onChange={setTemperament}
          dark={dark}
          placeholder="Select temperament…"
        />

        <View style={styles.row}>
          <Text style={labelStyle}>Indoor</Text>
          <Switch
            value={indoor}
            onValueChange={setIndoor}
            trackColor={{ false: "#e5e7eb", true: accent }}
            thumbColor="#fff"
            ios_backgroundColor="#e5e7eb"
          />
        </View>

        <Text style={labelStyle}>Photo</Text>
        <Pressable style={[styles.photoButton, dark && styles.photoButtonDark]} onPress={pickImage}>
          <Text style={[styles.photoButtonText, dark && styles.photoButtonTextDark]}>{imageUri ? "Change photo" : "Add photo"}</Text>
        </Pressable>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

        <Text style={labelStyle}>Notes</Text>
        <TextInput
          style={[inputStyle, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          multiline
        />

        <Pressable style={[styles.button, dark && { backgroundColor: accent }]} onPress={submit} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>

        <Pressable style={[styles.cancel, dark && { borderColor: accent }]} onPress={() => router.back()}>
          <Text style={[styles.cancelText, dark && { color: accent }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  safeDark: { backgroundColor: "#0f1720" },
  container: { padding: 20, paddingTop: 40, flexGrow: 1, alignItems: "center" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#111827" },
  headingDark: { color: "#fff" },
  label: { marginTop: 12, marginBottom: 6, color: "#374151", fontWeight: "600", alignSelf: "flex-start" },
  labelDark: { color: "#d1d5db" },
  value: { color: "#6b7280", alignSelf: "flex-start" },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#111827",
  },
  inputDark: {
    borderColor: "#374151",
    backgroundColor: "#1a2535",
    color: "#fff",
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, width: "100%" },
  photoButton: { backgroundColor: "#f3f4f6", padding: 10, borderRadius: 8, marginTop: 6, alignItems: "center", width: "100%" },
  photoButtonDark: { backgroundColor: "#1a2535" },
  photoButtonText: { color: "#111827" },
  photoButtonTextDark: { color: "#d1d5db" },
  preview: { width: "100%", height: 200, borderRadius: 8, marginTop: 10 },
  button: { width: "100%", backgroundColor: "#111827", padding: 14, borderRadius: 8, marginTop: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  cancel: { width: "100%", backgroundColor: "transparent", borderWidth: 1, borderColor: "#111827", padding: 14, borderRadius: 8, marginTop: 12, alignItems: "center" },
  cancelText: { color: "#111827", fontWeight: "600" },
  inputDisabled: { opacity: 0.45 },
  generatedLabel: { fontSize: 12, marginTop: 4, alignSelf: "flex-start" },
  unknownToggle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, alignSelf: "flex-start" },
  unknownCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#9ca3af", alignItems: "center", justifyContent: "center" },
  unknownCheckmark: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 14 },
  unknownLabel: { fontSize: 14 },
});
