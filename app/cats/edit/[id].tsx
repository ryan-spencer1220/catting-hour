import { SelectField } from "@/components/select-field";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchCatById, updateCat, uploadImage } from "@/lib/cats";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CAT_TYPES = [
  "Domestic Shorthair", "Domestic Longhair", "Tabby", "Calico", "Tuxedo",
  "Tortoiseshell", "Siamese", "Persian", "Maine Coon", "Ragdoll",
  "Bengal", "Sphynx", "Scottish Fold", "Unknown",
];

const CAT_TEMPERAMENTS = [
  "Friendly", "Shy", "Playful", "Affectionate", "Independent",
  "Curious", "Lazy", "Skittish", "Vocal", "Aggressive",
];

const PURPLE = "#a78bfa";

export default function EditCat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [temperament, setTemperament] = useState("");
  const [indoor, setIndoor] = useState(true);
  const [notes, setNotes] = useState("");
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchCatById(id)
      .then((cat) => {
        if (!mounted || !cat) return;
        setName(cat.name ?? "");
        setType(cat.type ?? "");
        setTemperament(cat.temperament ?? "");
        setIndoor(cat.indoor ?? true);
        setNotes(cat.notes ?? "");
        setExistingImageUrl(cat.image ?? null);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

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
        if (uri) setNewImageUri(uri);
      }
    } catch (err) {
      console.warn("Camera error", err);
    }
  }

  async function openLibrary() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Photo library access is needed to change the photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri;
        if (uri) setNewImageUri(uri);
      }
    } catch (err) {
      console.warn("Image pick error", err);
    }
  }

  function pickImage() {
    Alert.alert("Change photo", "Choose a source", [
      { text: "Take photo", onPress: () => setTimeout(openCamera, 300) },
      { text: "Choose from library", onPress: () => setTimeout(openLibrary, 300) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please give this cat a name.");
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | null | undefined = undefined;
      if (newImageUri) {
        imageUrl = await uploadImage(newImageUri);
      }
      await updateCat(id, {
        name: name.trim(),
        type: type.trim() || undefined,
        temperament: temperament.trim() || undefined,
        indoor,
        notes: notes.trim() || undefined,
        ...(imageUrl !== undefined ? { image: imageUrl } : {}),
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const bg = dark ? "#0f1720" : "#fff";
  const inputStyle = [styles.input, dark && styles.inputDark];
  const labelStyle = [styles.label, dark && styles.labelDark];
  const previewUri = newImageUri ?? existingImageUrl;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={dark ? PURPLE : "#111827"} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, dark && styles.headingDark]}>Edit cat</Text>

        <Text style={labelStyle}>Name</Text>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholder="Cat name"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
        />

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
            trackColor={{ false: "#e5e7eb", true: PURPLE }}
            thumbColor="#fff"
            ios_backgroundColor="#e5e7eb"
          />
        </View>

        <Text style={labelStyle}>Photo</Text>
        <Pressable style={[styles.photoButton, dark && styles.photoButtonDark]} onPress={pickImage}>
          <Text style={[styles.photoButtonText, dark && styles.photoButtonTextDark]}>
            {previewUri ? "Change photo" : "Add photo"}
          </Text>
        </Pressable>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : null}

        <Text style={labelStyle}>Notes</Text>
        <TextInput
          style={[inputStyle, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.button, dark && styles.buttonDark, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? "Saving…" : "Save changes"}</Text>
        </Pressable>

        <Pressable
          style={[styles.cancel, dark && styles.cancelDark]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelText, dark && styles.cancelTextDark]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20, paddingTop: 40, flexGrow: 1, alignItems: "center" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#111827" },
  headingDark: { color: "#fff" },
  label: { marginTop: 12, marginBottom: 6, color: "#374151", fontWeight: "600", alignSelf: "flex-start" },
  labelDark: { color: "#d1d5db" },
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
  multiline: { minHeight: 100 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    width: "100%",
  },
  photoButton: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    alignItems: "center",
    width: "100%",
  },
  photoButtonDark: { backgroundColor: "#1a2535" },
  photoButtonText: { color: "#111827" },
  photoButtonTextDark: { color: "#d1d5db" },
  preview: { width: "100%", height: 200, borderRadius: 8, marginTop: 10 },
  button: {
    width: "100%",
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonDark: { backgroundColor: PURPLE },
  buttonText: { color: "#fff", fontWeight: "600" },
  cancel: {
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#111827",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  cancelDark: { borderColor: PURPLE },
  cancelText: { color: "#111827", fontWeight: "600" },
  cancelTextDark: { color: PURPLE },
});
