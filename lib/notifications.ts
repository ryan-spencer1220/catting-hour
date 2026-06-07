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
        await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
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
      await supabase.from("profiles").update({ push_token: null }).eq("id", userId);
    }
  } catch {}
  await AsyncStorage.setItem(PREF_KEY, "false");
}
