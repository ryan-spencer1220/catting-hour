import { useThemeContext } from "@/context/theme";
import { Slot } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function CatsLayout() {
  const { colorScheme } = useThemeContext();

  return (
    <View style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#0f1720" : "#fff" }}>
      <Slot />
    </View>
  );
}
