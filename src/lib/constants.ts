export const GUEST_TOKEN_COOKIE = "kimenosuke_guest_token";

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5;

export const EVENT_ATTRIBUTES = [
  { value: "アクティビティ", label: "みんなでやること" },
  { value: "食事", label: "たべたりのんだり" },
  { value: "宿泊", label: "とまるところ" },
  { value: "そのた", label: "ほかのこと" }
] as const;

export type EventAttribute = (typeof EVENT_ATTRIBUTES)[number]["value"];

export const EVENT_ATTRIBUTE_LABELS: Record<EventAttribute, string> = {
  食事: "たべたりのんだり",
  宿泊: "とまるところ",
  アクティビティ: "みんなでやること",
  そのた: "ほかのこと"
};

export const EVENT_TITLE_PLACEHOLDERS: Record<EventAttribute, string> = {
  アクティビティ: "例） 次回のイベント、週末のお出かけ先 など",
  食事: "例）週末のディナー、明日のあさごはん など",
  宿泊: "例）夏休みに泊まるホテル など",
  そのた: "例）お世話になった人へのプレゼント、名前 など"
};

export const EVENT_TITLE_PLACEHOLDER_UNSELECTED =
  "まず『どんなこと？』をえらんでね";

export const SUPABASE_MISSING_MESSAGE =
  "Supabase 接続設定が未設定です。.env.local に SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。";
