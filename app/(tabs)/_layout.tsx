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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarStyle: { backgroundColor: bg, borderTopColor: "#e6e6e6" },
      }}
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

      <Tabs.Screen
        name="cats"
        options={{
          // Hide the folder-based cats routes from the tab bar. They remain navigable via router.push('/cats/create') or router.push('/cats/1')
          tabBarButton: () => null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
