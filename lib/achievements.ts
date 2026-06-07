import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_cat", title: "First Cat!", description: "Added your first cat", icon: "🐱", threshold: 1 },
  { id: "cat_lover", title: "Cat Lover", description: "Added 5 cats", icon: "😸", threshold: 5 },
  { id: "cat_enthusiast", title: "Cat Enthusiast", description: "Added 10 cats", icon: "🐾", threshold: 10 },
  { id: "cat_collector", title: "Cat Collector", description: "Added 25 cats", icon: "🏅", threshold: 25 },
  { id: "cat_legend", title: "Cat Legend", description: "Added 50 cats", icon: "🏆", threshold: 50 },
  { id: "new_friend", title: "New Friend", description: "Got your first follower", icon: "🤝", threshold: 1 },
  { id: "five_friends", title: "Five Friends", description: "Reached 5 followers", icon: "👥", threshold: 5 },
  { id: "ten_friends", title: "Ten Friends", description: "Reached 10 followers", icon: "🌟", threshold: 10 },
  { id: "fifty_friends", title: "Fifty Friends", description: "Reached 50 followers", icon: "⭐", threshold: 50 },
  { id: "hundred_friends", title: "100 Friends", description: "Reached 100 followers", icon: "👑", threshold: 100 },
  { id: "state_2", title: "State Hopper", description: "Cats logged in 2 states", icon: "🗺️", threshold: 2 },
  { id: "state_5", title: "Road Tripper", description: "Cats logged in 5 states", icon: "🚗", threshold: 5 },
  { id: "state_10", title: "Cross Country", description: "Cats logged in 10 states", icon: "🌄", threshold: 10 },
  { id: "state_25", title: "Half the States", description: "Cats logged in 25 states", icon: "🏔️", threshold: 25 },
  { id: "state_50", title: "50 States!", description: "Cats logged in all 50 states", icon: "🇺🇸", threshold: 50 },
  { id: "country_2", title: "World Traveler", description: "Cats logged in 2 countries", icon: "✈️", threshold: 2 },
  { id: "country_5", title: "Globe Trotter", description: "Cats logged in 5 countries", icon: "🌍", threshold: 5 },
];

const FOLLOWER_ACHIEVEMENT_IDS = new Set([
  "new_friend", "five_friends", "ten_friends", "fifty_friends", "hundred_friends",
]);

const STATE_ACHIEVEMENT_IDS = new Set([
  "state_2", "state_5", "state_10", "state_25", "state_50",
]);

const COUNTRY_ACHIEVEMENT_IDS = new Set([
  "country_2", "country_5",
]);

const STORAGE_KEY = "@unlocked_achievements";

export async function getUnlockedAchievements(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function checkAndUnlockAchievements(catCount: number): Promise<Achievement[]> {
  const unlocked = await getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (FOLLOWER_ACHIEVEMENT_IDS.has(achievement.id)) continue;
    if (STATE_ACHIEVEMENT_IDS.has(achievement.id)) continue;
    if (COUNTRY_ACHIEVEMENT_IDS.has(achievement.id)) continue;
    if (catCount >= achievement.threshold && !unlocked.includes(achievement.id)) {
      newlyUnlocked.push(achievement);
      unlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {}
  }

  return newlyUnlocked;
}

export async function checkAndUnlockFollowerAchievements(followerCount: number): Promise<Achievement[]> {
  const unlocked = await getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (!FOLLOWER_ACHIEVEMENT_IDS.has(achievement.id)) continue;
    if (followerCount >= achievement.threshold && !unlocked.includes(achievement.id)) {
      newlyUnlocked.push(achievement);
      unlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {}
  }

  return newlyUnlocked;
}

export async function checkAndUnlockLocationAchievements(userId: string): Promise<Achievement[]> {
  const { data } = await supabase
    .from("cats")
    .select("state, country")
    .eq("owner", userId)
    .not("state", "is", null);

  const rows = data ?? [];
  const distinctStates = new Set(rows.map((r) => r.state).filter(Boolean)).size;
  const distinctCountries = new Set(rows.map((r) => r.country).filter(Boolean)).size;

  const unlocked = await getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.includes(achievement.id)) continue;
    if (STATE_ACHIEVEMENT_IDS.has(achievement.id) && distinctStates >= achievement.threshold) {
      newlyUnlocked.push(achievement);
      unlocked.push(achievement.id);
    } else if (COUNTRY_ACHIEVEMENT_IDS.has(achievement.id) && distinctCountries >= achievement.threshold) {
      newlyUnlocked.push(achievement);
      unlocked.push(achievement.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {}
  }

  return newlyUnlocked;
}
