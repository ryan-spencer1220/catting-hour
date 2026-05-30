import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeContext } from "@/context/theme";
import { signOut as supabaseSignOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, TouchableOpacity, View } from "react-native";

const PURPLE = "#a78bfa";

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference, colorScheme } = useThemeContext();
  const dark = colorScheme === "dark";
  const useDarkMode = preference === "dark";

  const switchProps = {
    trackColor: { false: "#e5e7eb", true: PURPLE },
    thumbColor: dark ? "#fff" : "#fff",
    ios_backgroundColor: "#e5e7eb",
  };

  function setUseDarkMode(enabled: boolean) {
    setPreference(enabled ? "dark" : "system");
  }
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [useMetric, setUseMetric] = useState(true);
  const [syncFavorites, setSyncFavorites] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn("Failed to get user", error);
        } else if (mounted) {
          setUserEmail((data as any)?.user?.email ?? null);
        }
      } catch (e) {
        console.warn(e);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  function confirmClearCache() {
    Alert.alert("Clear cache", "Are you sure you want to clear cached data?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          // TODO: hook up actual cache clearing logic
          Alert.alert("Cache cleared", "App cache was cleared successfully.");
        },
      },
    ]);
  }

  function handleSignOut() {
    Alert.alert("Sign out", "Sign out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          // perform async sign out
          (async () => {
            try {
              setSigningOut(true);
              await supabaseSignOut();
              // onAuthStateChange in _layout.tsx handles the redirect to "/"
            } catch (err: any) {
              Alert.alert("Sign out failed", err?.message || String(err));
            } finally {
              setSigningOut(false);
            }
          })();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        <ThemedText type="title" style={styles.header}>
          Settings
        </ThemedText>

        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Appearance
          </ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.rowLabel}>Dark mode</ThemedText>
            <Switch {...switchProps} value={useDarkMode} onValueChange={setUseDarkMode} />
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.rowLabel}>Accent color</ThemedText>
            <ThemedText style={styles.muted}>Default</ThemedText>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notifications
          </ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.rowLabel}>Enable notifications</ThemedText>
            <Switch {...switchProps} value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
          </View>

          <View style={styles.row}>
            <ThemedText style={styles.rowLabel}>Sync favorites</ThemedText>
            <Switch {...switchProps} value={syncFavorites} onValueChange={setSyncFavorites} />
          </View>
        </View>

        {/* Units */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Units
          </ThemedText>

          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText style={styles.rowLabel}>Distance</ThemedText>
            </View>

            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity style={[styles.unitButton, useMetric && styles.unitButtonActive]} onPress={() => setUseMetric(true)}>
                <ThemedText style={[styles.unitText, useMetric && styles.unitTextActive]}>km</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.unitButton, !useMetric && styles.unitButtonActive]} onPress={() => setUseMetric(false)}>
                <ThemedText style={[styles.unitText, !useMetric && styles.unitTextActive]}>mi</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Data
          </ThemedText>

          <TouchableOpacity style={styles.action} onPress={confirmClearCache}>
            <ThemedText style={styles.actionText}>Clear cache</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account
          </ThemedText>

          {userEmail ? (
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>Signed in as</ThemedText>
              <ThemedText style={styles.muted}>{userEmail}</ThemedText>
            </View>
          ) : (
            <View style={styles.row}>
              <ThemedText style={styles.rowLabel}>Not signed in</ThemedText>
            </View>
          )}

          <TouchableOpacity style={[styles.action, styles.danger]} onPress={handleSignOut} disabled={signingOut}>
            <ThemedText style={[styles.actionText, styles.dangerText]}>{signingOut ? "Signing out..." : "Sign out"}</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Footer / Info */}
        <View style={{ paddingVertical: 24 }}>
          <ThemedText style={styles.muted}>App version: 1.0.0</ThemedText>
          <ThemedText style={styles.muted}>Built for demo purposes — settings are local only.</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20 },
  header: { marginBottom: 12 },
  section: { marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e6e9ee", paddingTop: 12 },
  sectionTitle: { marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  rowLabel: { fontSize: 16 },
  muted: { fontSize: 13, color: "#6b7280" },
  unitButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  unitButtonActive: { backgroundColor: "#e6f2fb" },
  unitText: { fontSize: 14, color: "#374151" },
  unitTextActive: { fontWeight: "700" },
  action: { paddingVertical: 12 },
  actionText: { fontSize: 16 },
  danger: { marginTop: 8 },
  dangerText: { color: "#dc2626" },
});
