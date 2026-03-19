// filepath: /Users/macbookpro/catting-hour/app/(auth)/register.tsx
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { signUpWithEmail } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function RegisterScreen() {
  const router = useRouter();
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
      await signUpWithEmail(email, password);
      Alert.alert("Registered", "Please check your email for a confirmation link.");
      router.push("/(auth)/login");
    } catch (e: any) {
      Alert.alert("Registration failed", e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="title">Create account</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          autoComplete="off"
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <ThemedText style={styles.buttonText}>{loading ? "Creating..." : "Create account"}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.push("/(auth)/login")}>
          <ThemedText type="link">Already have an account? Sign in</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", padding: 12, borderRadius: 8, marginTop: 12 },
  button: { marginTop: 16, padding: 12, backgroundColor: "#0a7ea4", borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff" },
});
