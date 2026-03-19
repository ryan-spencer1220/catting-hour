import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const activeTint = colorScheme === "dark" ? "#fff" : "#111827";
  const bg = colorScheme === "dark" ? "#0b1220" : "#fff";

  return (
    <Tabs
      // Use a function so we can hide specific auto-generated routes (like the nested `cats` folder)
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarStyle: { backgroundColor: bg, borderTopColor: "#e6e6e6", display: "flex", justifyContent: "space-around", paddingHorizontal: 8 },
        // Hide the auto-generated 'cats' tab (exactly 'cats' or generated names such as 'cats_index' or 'cats_create')
        tabBarButton:
          typeof route.name === "string" && (route.name === "cats" || route.name === "cats_index" || route.name.startsWith("cats_"))
            ? () => null
            : undefined,
      })}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="recently"
        options={{
          title: "Recently",
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="my-cats"
        options={{
          title: "My Cats",
          tabBarIcon: ({ color, size }) => <Ionicons name="paw" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />

      {/* The 'cats' folder routes (e.g. /cats/create) are intentionally not added as a tab. */}
    </Tabs>
  );
}
