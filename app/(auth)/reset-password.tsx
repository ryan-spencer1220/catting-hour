import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!password) {
      Alert.alert("Required", "Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert("Password updated", "Your password has been changed. Please sign in.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = [styles.input, dark && styles.inputDark];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="title" style={styles.heading}>Set new password</ThemedText>
        <ThemedText style={styles.body}>Choose a new password for your account.</ThemedText>

        <TextInput
          style={inputStyle}
          placeholder="New password"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <TextInput
          style={inputStyle}
          placeholder="Confirm new password"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, dark && { backgroundColor: accent }, loading && { opacity: 0.6 }]}
          onPress={handleReset}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? "Updating…" : "Update password"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24 },
  heading: { marginBottom: 8 },
  body: { marginTop: 4, marginBottom: 4, color: "#6b7280", lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputDark: {
    borderColor: "#374151",
    backgroundColor: "#1a2535",
    color: "#fff",
  },
  button: {
    marginTop: 20,
    padding: 14,
    backgroundColor: "#111827",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
