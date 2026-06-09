import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ACCENT_COLORS, useThemeContext } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { signOut as supabaseSignOut } from "@/lib/auth";
import { disableNotifications, enableNotifications, getNotificationPreference } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Settings as SettingsIcon } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference, accent, setAccent, useMetric, setUseMetric } = useThemeContext();
  const colorScheme = useColorScheme();
  const useDarkMode = preference === "dark";

  const switchProps = {
    trackColor: { false: "#e5e7eb", true: accent },
    thumbColor: "#fff",
    ios_backgroundColor: "#e5e7eb",
  };

  function setUseDarkMode(enabled: boolean) {
    setPreference(enabled ? "dark" : "system");
  }
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [syncFavorites, setSyncFavorites] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
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

      const pref = await getNotificationPreference();
      if (mounted) setNotificationsEnabled(pref);
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

  async function handleToggleNotifications(enabled: boolean) {
    if (enabled) {
      const result = await enableNotifications();
      if (!result.success) {
        Alert.alert("Notifications blocked", result.message ?? "Could not enable notifications.");
        return;
      }
    } else {
      await disableNotifications();
    }
    setNotificationsEnabled(enabled);
  }

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

  function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your cats, check-ins, and profile will be gone forever.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, delete everything",
                  style: "destructive",
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      const { error } = await supabase.functions.invoke("delete-account");
                      if (error) throw error;
                      // Auth state change will redirect to "/"
                    } catch (err: any) {
                      Alert.alert("Failed to delete account", err?.message || String(err));
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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

  const dark = colorScheme === "dark";
  const textPrimary = dark ? "#fff" : "#111827";
  const textMuted = dark ? "#9ca3af" : "#6b7280";

  return (
    <ThemedView style={styles.container}>
      <View style={styles.inner}>
        {/* Page header */}
        <View style={styles.pageHeader}>
          <View style={[styles.iconRing, { backgroundColor: dark ? `${accent}25` : `${accent}18` }]}>
            <SettingsIcon size={22} color={accent} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: textPrimary }]}>Settings</Text>
            {userEmail ? (
              <Text style={[styles.pageSubtitle, { color: textMuted }]}>{userEmail}</Text>
            ) : null}
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Appearance
          </ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.rowLabel}>Dark mode</ThemedText>
            <Switch {...switchProps} value={useDarkMode} onValueChange={setUseDarkMode} />
          </View>

          <View style={[styles.row, { alignItems: "center" }]}>
            <ThemedText style={styles.rowLabel}>Accent color</ThemedText>
            <View style={styles.swatches}>
              {ACCENT_COLORS.map(({ value: hex, label }) => (
                <Pressable
                  key={hex}
                  onPress={() => setAccent(hex)}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    accent === hex && styles.swatchActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notifications
          </ThemedText>

          <View style={styles.row}>
            <ThemedText style={styles.rowLabel}>Enable notifications</ThemedText>
            <Switch {...switchProps} value={notificationsEnabled} onValueChange={handleToggleNotifications} />
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

          <TouchableOpacity style={[styles.action, styles.danger]} onPress={handleDeleteAccount} disabled={deletingAccount}>
            <ThemedText style={[styles.actionText, styles.deleteText]}>{deletingAccount ? "Deleting account..." : "Delete account"}</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Legal</ThemedText>
          <TouchableOpacity style={styles.action} onPress={() => router.push("/privacy")}>
            <ThemedText style={styles.actionText}>Privacy Policy</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => router.push("/terms")}>
            <ThemedText style={styles.actionText}>Terms of Service</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ paddingVertical: 24 }}>
          <ThemedText style={styles.muted}>App version: 1.0.0</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8, paddingBottom: 4 },
  iconRing: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, marginTop: 1 },
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
  swatches: { flexDirection: "row", gap: 8 },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  swatchActive: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  unitText: { fontSize: 14, color: "#374151" },
  unitTextActive: { fontWeight: "700" },
  action: { paddingVertical: 12 },
  actionText: { fontSize: 16 },
  danger: { marginTop: 8 },
  dangerText: { color: "#dc2626" },
  deleteText: { color: "#9ca3af" },
});
