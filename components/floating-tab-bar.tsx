import { useAccent } from "@/context/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const dark = colorScheme === "dark";
  const accent = useAccent();
  const insets = useSafeAreaInsets();

  const inactiveColor = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
      <View style={styles.pillShadow}>
        <BlurView
          intensity={dark ? 60 : 70}
          tint={dark ? "dark" : "light"}
          style={styles.pill}
        >
          {/* Overlay tint on top of the blur */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 40,
                backgroundColor: dark
                  ? "rgba(15,23,32,0.55)"
                  : "rgba(255,255,255,0.55)",
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            if (!options.tabBarIcon) return null;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            const iconColor = isFocused ? accent : inactiveColor;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
              >
                {/* Active indicator dot */}
                {isFocused && (
                  <View style={[styles.activeDot, { backgroundColor: accent }]} />
                )}
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: iconColor,
                  size: 28,
                })}
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pillShadow: {
    borderRadius: 40,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    // Android elevation
    elevation: 12,
  },
  pill: {
    flexDirection: "row",
    borderRadius: 40,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 10,
    marginHorizontal: 48,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 44,
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
