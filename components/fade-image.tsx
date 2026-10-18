import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  /** Description read by screen readers. Omit for decorative images. */
  accessibilityLabel?: string;
};

export function FadeImage({ uri, style, resizeMode = "cover", accessibilityLabel }: Props) {
  const dark = useColorScheme() === "dark";
  const [loaded, setLoaded] = useState(false);
  const imageOpacity = useSharedValue(0);
  const shimmerOpacity = useSharedValue(1);

  const imageStyle = useAnimatedStyle(() => ({ opacity: imageOpacity.value }));
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmerOpacity.value }));

  function startShimmer() {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }

  function handleLoad() {
    setLoaded(true);
    shimmerOpacity.value = withTiming(0, { duration: 150 });
    imageOpacity.value = withTiming(1, { duration: 250 });
  }

  const bg = dark ? "#2d3f55" : "#e5e7eb";
  const shimmerBg = dark ? "#3a4f68" : "#d1d5db";

  return (
    <View
      style={[styles.root, { backgroundColor: bg }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!accessibilityLabel}
    >
      {!loaded && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: shimmerBg }, shimmerStyle]}
        />
      )}
      <Animated.Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { resizeMode }, imageStyle]}
        onLoad={handleLoad}
        onLoadStart={startShimmer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: "hidden" },
});
