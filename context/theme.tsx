import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export type AccentColor = {
  label: string;
  value: string;
};

export const ACCENT_COLORS: AccentColor[] = [
  { label: "Navy",    value: "#1B5091" },
  { label: "Teal",    value: "#279D9F" },
  { label: "Amber",   value: "#FFA74F" },
  { label: "Pink",    value: "#E881A6" },
  { label: "Magenta", value: "#CE3375" },
];

const THEME_STORAGE_KEY = "@theme_preference";
const ACCENT_STORAGE_KEY = "@accent_color";
const METRIC_STORAGE_KEY = "@use_metric";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  accent: string;
  setAccent: (color: string) => void;
  useMetric: boolean;
  setUseMetric: (metric: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [accent, setAccentState] = useState(ACCENT_COLORS[0].value);
  const [useMetric, setUseMetricState] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([THEME_STORAGE_KEY, ACCENT_STORAGE_KEY, METRIC_STORAGE_KEY]).then(
      ([[, theme], [, storedAccent], [, storedMetric]]) => {
        if (theme === "light" || theme === "dark" || theme === "system") setPreferenceState(theme);
        if (storedAccent && ACCENT_COLORS.some((a) => a.value === storedAccent)) setAccentState(storedAccent);
        if (storedMetric !== null) setUseMetricState(storedMetric === "true");
      }
    );
  }, []);

  function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  }

  function setAccent(color: string) {
    setAccentState(color);
    AsyncStorage.setItem(ACCENT_STORAGE_KEY, color);
  }

  function setUseMetric(metric: boolean) {
    setUseMetricState(metric);
    AsyncStorage.setItem(METRIC_STORAGE_KEY, String(metric));
  }

  const colorScheme: ColorScheme = preference === "system" ? systemScheme : preference;

  return (
    <ThemeContext.Provider value={{ colorScheme, preference, setPreference, accent, setAccent, useMetric, setUseMetric }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeContextProvider");
  return ctx;
}

export function useAccent(): string {
  return useThemeContext().accent;
}
