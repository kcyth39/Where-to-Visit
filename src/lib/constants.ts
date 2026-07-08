export const GUEST_TOKEN_COOKIE = "kimenosuke_guest_token";

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5;

export const EVENT_ATTRIBUTES = [
  { value: "食事", label: "食事" },
  { value: "宿泊", label: "宿泊" },
  { value: "アクティビティ", label: "アクティビティ" },
  { value: "そのた", label: "そのた" }
] as const;

export type EventAttribute = (typeof EVENT_ATTRIBUTES)[number]["value"];

export const EVENT_ATTRIBUTE_LABELS: Record<EventAttribute, string> = {
  食事: "食事",
  宿泊: "宿泊",
  アクティビティ: "アクティビティ",
  そのた: "そのた"
};

export const SUPABASE_MISSING_MESSAGE =
  "Supabase 接続設定が未設定です。.env に SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。";
