import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { signInWithEmail } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/(tabs)/map");
    } catch (e: any) {
      Alert.alert("Sign in failed", e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = [styles.input, dark && styles.inputDark];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="title" style={styles.heading}>Sign in</ThemedText>

        <TextInput
          style={inputStyle}
          placeholder="Email"
          accessibilityLabel="Email"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TextInput
          style={inputStyle}
          placeholder="Password"
          accessibilityLabel="Password"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={[styles.button, dark && { backgroundColor: accent }]} onPress={handleSignIn} disabled={loading} accessibilityRole="button">
          <ThemedText style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/(auth)/forgot-password")} accessibilityRole="link">
          <ThemedText type="link">Forgot password?</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/(auth)/register")} accessibilityRole="link">
          <ThemedText type="link">{"Don't have an account? Register"}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  heading: { marginBottom: 8 },
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
    paddingVertical: 16,
    backgroundColor: "#111827",
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkRow: { marginTop: 16, alignItems: "center" },
});
