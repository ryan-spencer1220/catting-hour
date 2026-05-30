import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { signUpWithEmail } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

const PURPLE = "#a78bfa";

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password) {
      Alert.alert("Validation", "Please provide email and password.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await signUpWithEmail(email, password, username.trim() || undefined);
      if (data.session) {
        // Email confirmation is disabled — user is immediately signed in.
        // onAuthStateChange in _layout.tsx handles the redirect.
      } else {
        Alert.alert("Check your email", "A confirmation link has been sent to your email address.");
        router.push("/(auth)/login");
      }
    } catch (e: any) {
      Alert.alert("Registration failed", e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = [styles.input, dark && styles.inputDark];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="title" style={styles.heading}>Create account</ThemedText>

        <TextInput
          style={inputStyle}
          placeholder="Username (optional)"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="nickname"
          autoComplete="username"
        />

        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
        />

        <TextInput
          style={inputStyle}
          placeholder="Password"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
        />

        <TextInput
          style={inputStyle}
          placeholder="Confirm password"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
        />

        <TouchableOpacity style={[styles.button, dark && styles.buttonDark]} onPress={handleRegister} disabled={loading}>
          <ThemedText style={styles.buttonText}>{loading ? "Creating..." : "Create account"}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/(auth)/login")}>
          <ThemedText type="link">Already have an account? Sign in</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 24 },
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
    padding: 14,
    backgroundColor: "#111827",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDark: { backgroundColor: PURPLE },
  buttonText: { color: "#fff", fontWeight: "600" },
  linkRow: { marginTop: 16, alignItems: "center" },
});
