import React from "react";

// Hide the entire 'cats' folder from the bottom tab bar
export const unstable_settings = { tabBarButton: () => null };

// This layout intentionally renders nothing inside the tab group to avoid
// creating a nested slot that can interfere with the main Tabs layout.
export default function CatsTabsLayout() {
  return null;
}
