import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "cattinghour://reset-password",
      });
      if (error) throw error;
      setSent(true);
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
        <ThemedText type="title" style={styles.heading}>Reset password</ThemedText>

        {sent ? (
          <>
            <ThemedText style={styles.body}>
              Check your inbox — we sent a password reset link to {email}.
            </ThemedText>
            <TouchableOpacity style={[styles.button, dark && { backgroundColor: accent }]} onPress={() => router.back()}>
              <ThemedText style={styles.buttonText}>Back to sign in</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ThemedText style={styles.body}>
              Enter the email address for your account and we&apos;ll send you a reset link.
            </ThemedText>

            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, dark && { backgroundColor: accent }, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
            >
              <ThemedText style={styles.buttonText}>
                {loading ? "Sending…" : "Send reset link"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} onPress={() => router.back()}>
              <ThemedText type="link">Back to sign in</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24 },
  heading: { marginBottom: 8 },
  body: { marginTop: 8, marginBottom: 4, color: "#6b7280", lineHeight: 22 },
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
  linkRow: { marginTop: 16, alignItems: "center" },
});
