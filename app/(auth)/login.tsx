// filepath: /Users/macbookpro/catting-hour/app/(auth)/login.tsx
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { signInWithEmail } from "@/lib/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // navigate to map after successful sign in
      router.replace("/map");
      // TODO: navigate to app flow
    } catch (e: any) {
      Alert.alert("Sign in failed", e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="title">Sign in</ThemedText>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
          <ThemedText style={styles.buttonText}>{loading ? "Signing in..." : "Sign in"}</ThemedText>
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
