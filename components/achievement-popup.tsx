import { useAccent } from "@/context/theme";
import { Achievement } from "@/lib/achievements";
import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

type Props = {
  achievement: Achievement | null;
  onDismiss: () => void;
};

export function AchievementPopup({ achievement, onDismiss }: Props) {
  const accent = useAccent();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.7);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (achievement) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    } else {
      opacity.value = 0;
      scale.value = 0.7;
    }
  }, [achievement, opacity, scale]);

  if (!achievement) return null;

  return (
    <Modal transparent animationType="none" visible={!!achievement} onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View style={[styles.card, animatedStyle, { borderColor: accent }]}>
          <Text style={styles.badge}>🎉</Text>
          <Text style={[styles.achievedLabel, { color: accent }]}>Achievement Unlocked!</Text>
          <Text style={styles.icon}>{achievement.icon}</Text>
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
          <Pressable style={[styles.button, { backgroundColor: accent }]} onPress={onDismiss}>
            <Text style={styles.buttonText}>Awesome!</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1a2535",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  badge: { fontSize: 28, marginBottom: 4 },
  achievedLabel: {
    color: "transparent",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  icon: { fontSize: 52, marginBottom: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  description: { color: "#9ca3af", fontSize: 14, textAlign: "center", marginBottom: 24 },
  button: {
    backgroundColor: "transparent",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
