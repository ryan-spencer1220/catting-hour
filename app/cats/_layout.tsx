import { Slot } from "expo-router";
import React from "react";

// Hide the 'cats' folder from the bottom tab bar so its routes are accessible
// via navigation but not shown as a tab (prevents an extra tab/placeholder).
export const unstable_settings = { tabBarButton: () => null };

export default function CatsLayout() {
  return <Slot />;
}
