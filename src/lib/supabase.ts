import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";

type SupabaseResult =
  | { client: SupabaseClient; configError: null }
  | { client: null; configError: string };

export function getSupabaseServerClient(): SupabaseResult {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { client: null, configError: SUPABASE_MISSING_MESSAGE };
  }

  return {
    client: createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }),
    configError: null
  };
}
