import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS, checkAndUnlockAchievements, getUnlockedAchievements } from '../lib/achievements';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ACHIEVEMENTS', () => {
  it('has thresholds in ascending order', () => {
    const thresholds = ACHIEVEMENTS.map((a) => a.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });

  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('checkAndUnlockAchievements', () => {
  it('returns no achievements when cat count is 0', async () => {
    const result = await checkAndUnlockAchievements(0);
    expect(result).toHaveLength(0);
  });

  it('unlocks first_cat when count reaches 1', async () => {
    const result = await checkAndUnlockAchievements(1);
    expect(result.map((a) => a.id)).toContain('first_cat');
  });

  it('unlocks multiple achievements at once when jumping thresholds', async () => {
    const result = await checkAndUnlockAchievements(5);
    const ids = result.map((a) => a.id);
    expect(ids).toContain('first_cat');
    expect(ids).toContain('cat_lover');
  });

  it('does not re-unlock already unlocked achievements', async () => {
    await checkAndUnlockAchievements(1);
    const second = await checkAndUnlockAchievements(1);
    expect(second).toHaveLength(0);
  });

  it('persists unlocked achievements across calls', async () => {
    await checkAndUnlockAchievements(1);
    const stored = await getUnlockedAchievements();
    expect(stored).toContain('first_cat');
  });

  it('unlocks cat_enthusiast at 10', async () => {
    const result = await checkAndUnlockAchievements(10);
    expect(result.map((a) => a.id)).toContain('cat_enthusiast');
  });
});

describe('getUnlockedAchievements', () => {
  it('returns empty array when nothing is stored', async () => {
    const result = await getUnlockedAchievements();
    expect(result).toEqual([]);
  });

  it('returns previously unlocked achievement ids', async () => {
    await checkAndUnlockAchievements(1);
    const result = await getUnlockedAchievements();
    expect(result).toContain('first_cat');
  });
});
