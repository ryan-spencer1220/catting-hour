import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface Props {
  style?: StyleProp<ViewStyle>;
  radius?: number;
  light?: boolean; // use on coloured/accent backgrounds
}

export function Skeleton({ style, radius = 6, light = false }: Props) {
  const dark = useColorScheme() === "dark";
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bg = light ? "rgba(255,255,255,0.25)" : dark ? "#1e2d3d" : "#e5e7eb";

  return (
    <Animated.View style={[{ backgroundColor: bg, borderRadius: radius }, style, animStyle]} />
  );
}
