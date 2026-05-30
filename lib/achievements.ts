import AsyncStorage from "@react-native-async-storage/async-storage";

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
];

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
