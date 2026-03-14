import { Slot } from "expo-router";
import React from "react";

// Hide the entire 'cats' folder from the bottom tab bar
export const unstable_settings = { tabBarButton: () => null };

export default function CatsTabsLayout() {
  return <Slot />;
}
