import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_MISSING_MESSAGE } from "@/lib/constants";

type SupabaseResult =
  | { client: SupabaseClient; configError: null }
  | { client: null; configError: string };

export type SupabaseAccessTokens = {
  shareToken?: string;
  ownerToken?: string;
  guestToken?: string;
};

function buildAccessHeaders(tokens: SupabaseAccessTokens): Record<string, string> {
  const headers: Record<string, string> = {};

  if (tokens.shareToken) {
    headers["x-share-token"] = tokens.shareToken;
  }

  if (tokens.ownerToken) {
    headers["x-owner-token"] = tokens.ownerToken;
  }

  if (tokens.guestToken) {
    headers["x-guest-token"] = tokens.guestToken;
  }

  return headers;
}

export function getSupabaseServerClient(
  tokens: SupabaseAccessTokens = {}
): SupabaseResult {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { client: null, configError: SUPABASE_MISSING_MESSAGE };
  }

  return {
    client: createClient(url, anonKey, {
      global: {
        headers: buildAccessHeaders(tokens)
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }),
    configError: null
  };
}
