export const OWNER_TOKEN_COOKIE = "kimenosuke_owner_token";

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5;

export const EVENT_TITLE_PLACEHOLDER = "例）週末どこ行く？ など";

export const CANDIDATE_TITLE_PLACEHOLDER = "例）候補の名前 など";

export const DEFAULT_CRITERION_LABEL = "興味ある？";

export const CRITERION_PRESETS = [
  "価格どう？",
  "雰囲気どう？",
  "場所はどう？",
  "色はどう？"
] as const;

export const CRITERION_LABEL_MAX_LENGTH = 60;

export const COMMENT_MAX_LENGTH = 500;

export const SUPABASE_MISSING_MESSAGE =
  "Supabase 接続設定が未設定です。SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。";
