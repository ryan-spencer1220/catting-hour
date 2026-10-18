import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { signUpWithEmail } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      Alert.alert("Validation", "Please choose a username.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(trimmedUsername)) {
      Alert.alert("Invalid username", "Username must be 2–30 characters and can only contain letters, numbers, underscores, and hyphens.");
      return;
    }
    if (!email || !password) {
      Alert.alert("Validation", "Please provide email and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await signUpWithEmail(email, password, trimmedUsername || undefined);
      if (data.session) {
        // Email confirmation is disabled — user is immediately signed in.
        // onAuthStateChange in _layout.tsx handles the redirect.
      } else {
        Alert.alert("Check your email", "A confirmation link has been sent to your email address.");
        router.push("/(auth)/login");
      }
    } catch (e: any) {
      const msg = e.message || String(e);
      const friendly = msg.includes("unique") || msg.includes("duplicate")
        ? "That username is already taken."
        : msg.includes("email")
        ? "An account with that email already exists."
        : "Registration failed. Please try again.";
      Alert.alert("Registration failed", friendly);
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
          placeholder="Username"
          accessibilityLabel="Username"
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
          accessibilityLabel="Email"
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
          accessibilityLabel="Password"
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
          accessibilityLabel="Confirm password"
          placeholderTextColor={dark ? "#6b7280" : "#9ca3af"}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
        />

        <Text style={[styles.consent, { color: dark ? "#6b7280" : "#9ca3af" }]}>
          By creating an account you agree to our{" "}
          <Text style={{ color: accent }} onPress={() => router.push("/terms")}>Terms of Service</Text>
          {" "}and{" "}
          <Text style={{ color: accent }} onPress={() => router.push("/privacy")}>Privacy Policy</Text>.
        </Text>

        <TouchableOpacity style={[styles.button, dark && { backgroundColor: accent }]} onPress={handleRegister} disabled={loading} accessibilityRole="button">
          <ThemedText style={styles.buttonText}>{loading ? "Creating..." : "Create account"}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/(auth)/login")} accessibilityRole="link">
          <ThemedText type="link">Already have an account? Sign in</ThemedText>
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
  consent: { fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: "center" },
});
