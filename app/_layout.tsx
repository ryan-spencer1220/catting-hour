import { ThemeContextProvider, useThemeContext } from "@/context/theme";
import { supabase } from "@/lib/supabase";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import "react-native-reanimated";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <ThemeContextProvider>
      <RootLayoutInner />
    </ThemeContextProvider>
  );
}

function RootLayoutInner() {
  const { colorScheme } = useThemeContext();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Handle deep link tokens (e.g. password reset email callback)
    async function handleDeepLink(url: string | null) {
      if (!url) return;
      const fragment = url.split("#")[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        if (type === "recovery") router.replace("/(auth)/reset-password");
      }
    }

    // App opened from a deep link (was closed)
    Linking.getInitialURL().then(handleDeepLink);

    // Deep link received while app is already running
    const linkSub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url));

    // Restore an existing session on app launch, then hide splash
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/(tabs)/map");
      else router.replace("/");
      setAppReady(true);
    });

    // React to sign-in / sign-out events from anywhere in the app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.replace("/(tabs)/map");
      if (event === "SIGNED_OUT") router.replace("/");
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="cats" options={{ headerShown: false }} />
        <Stack.Screen name="my-logged-cats" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
