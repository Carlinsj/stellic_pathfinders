import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonymousKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonymousKey
    ? createClient(url, anonymousKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const hasSupabaseConnection = Boolean(supabase);
