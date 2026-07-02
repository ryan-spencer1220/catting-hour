import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const PREF_KEY = "@notifications_enabled";
const isExpoGo = (Constants as any).appOwnership === "expo";

// setNotificationHandler triggers expo-notifications warnings in Expo Go
// because remote push support was removed from Expo Go in SDK 53.
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getNotificationPreference(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(PREF_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export async function enableNotifications(): Promise<{ success: boolean; message?: string }> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }

  if (status !== "granted") {
    return { success: false, message: "Permission denied. Enable notifications in your device Settings." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  if (!isExpoGo) {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId) {
        await supabase.from("user_settings").upsert({ id: userId, push_token: token });
      }
    } catch {}
  }

  await AsyncStorage.setItem(PREF_KEY, "true");
  return { success: true };
}

export async function disableNotifications(): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userId) {
      await supabase.from("user_settings").upsert({ id: userId, push_token: null });
    }
  } catch {}
  await AsyncStorage.setItem(PREF_KEY, "false");
}

// ── Per-category preferences (stored on the profile so the server-side
// triggers can honour them when deciding whether to send) ──────────────────

export type NotifPrefs = {
  nearby: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
};

const PREF_COLUMNS: Record<keyof NotifPrefs, string> = {
  nearby: "notify_nearby",
  likes: "notify_likes",
  comments: "notify_comments",
  follows: "notify_follows",
};

const DEFAULT_PREFS: NotifPrefs = { nearby: true, likes: true, comments: true, follows: true };

export async function getNotificationSettings(): Promise<NotifPrefs> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return DEFAULT_PREFS;
    const { data } = await supabase
      .from("user_settings")
      .select("notify_nearby, notify_likes, notify_comments, notify_follows")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return DEFAULT_PREFS;
    return {
      nearby: data.notify_nearby ?? true,
      likes: data.notify_likes ?? true,
      comments: data.notify_comments ?? true,
      follows: data.notify_follows ?? true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function updateNotificationSetting(key: keyof NotifPrefs, value: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return;
  await supabase.from("user_settings").upsert({ id: userId, [PREF_COLUMNS[key]]: value });
}

// Keep the profile's last-known location fresh so "cat added near me" can match.
export async function updateUserLocation(lat: number, lng: number): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    await supabase.from("user_settings").upsert({ id: userId, lat, lng });
  } catch {}
}
