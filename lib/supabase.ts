import { createClient } from "@supabase/supabase-js";

// Using the Supabase credentials provided for development.
// In production move these into secure environment variables.
const SUPABASE_URL = "https://qbpneukurthgcqnlzdjk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NjR1qy_JZgHZyGExmTCQHw_a7U3zdQX";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});
