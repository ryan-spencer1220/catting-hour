import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

export default function CreateCat() {
  const params = useLocalSearchParams<{ lng?: string; lat?: string }>();
  const router = useRouter();
  const lng = parseFloat(params.lng ?? "0");
  const lat = parseFloat(params.lat ?? "0");

  useEffect(() => {
    // log mounting and params so we can see if the screen is being reached
    // eslint-disable-next-line no-console
    console.log("CreateCat mounted", { params, lng, lat });
  }, [params]);

  const [name, setName] = useState("");
  const [type, setType] = useState("Unknown");
  const [temperament, setTemperament] = useState("Friendly");
  const [indoor, setIndoor] = useState(true);
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Permission to access the photo library is required to add a picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        // expo-image-picker v14+ returns { assets: [{ uri }] } on web/native; older returns { cancelled, uri }
        // handle both shapes
        // @ts-ignore
        const uri = (result.assets && result.assets[0] && result.assets[0].uri) || (result as any).uri;
        if (uri) setImageUri(uri);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Image pick error", err);
    }
  }

  function submit() {
    // For now just log the entry and go back
    // Later we'll persist to backend or local store
    // eslint-disable-next-line no-console
    console.log("Create cat", { name, type, temperament, indoor, notes, lng, lat, imageUri });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>Create screen — params: {JSON.stringify(params)}</Text>
        </View>
        <Text style={styles.heading}>Add a cat</Text>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </Text>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Cat name" />

        <Text style={styles.label}>Type</Text>
        <TextInput style={styles.input} value={type} onChangeText={setType} placeholder="Breed or type" />

        <Text style={styles.label}>Temperament</Text>
        <TextInput style={styles.input} value={temperament} onChangeText={setTemperament} placeholder="Friendly / Shy / Aggressive" />

        <View style={styles.row}>
          <Text style={styles.label}>Indoor</Text>
          <Switch value={indoor} onValueChange={setIndoor} />
        </View>

        <Text style={styles.label}>Photo</Text>
        <Pressable style={styles.photoButton} onPress={pickImage}>
          <Text style={styles.photoButtonText}>{imageUri ? "Change photo" : "Add photo"}</Text>
        </Pressable>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} placeholder="Any notes" multiline />

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Save</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.cancel]} onPress={() => router.back()}>
          <Text style={[styles.buttonText, styles.cancelText]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, paddingTop: 40, flexGrow: 1, alignItems: "center" },
  debugBanner: { width: "100%", backgroundColor: "#ffeb3b", padding: 8, borderRadius: 6, marginBottom: 12, alignItems: "center" },
  debugText: { color: "#111", fontWeight: "700" },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 6, color: "#374151", fontWeight: "600" },
  value: { color: "#6b7280" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", padding: 10, borderRadius: 8, backgroundColor: "#fff" },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  photoButton: { backgroundColor: "#efefef", padding: 10, borderRadius: 8, marginTop: 6, alignItems: "center" },
  photoButtonText: { color: "#111827" },
  preview: { width: "100%", height: 200, borderRadius: 8, marginTop: 10 },
  button: { backgroundColor: "#111827", padding: 14, borderRadius: 8, marginTop: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  cancel: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#111827" },
  cancelText: { color: "#111827" },
});
