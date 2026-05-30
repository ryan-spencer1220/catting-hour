import { useThemeContext } from "@/context/theme";

export function useColorScheme() {
  return useThemeContext().colorScheme;
}
