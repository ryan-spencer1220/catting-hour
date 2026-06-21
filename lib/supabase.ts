import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Without an explicit storage adapter, supabase-js falls back to
    // localStorage, which doesn't exist in React Native — so the session
    // is lost on app restart. AsyncStorage persists it across launches.
    storage: AsyncStorage,
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});
