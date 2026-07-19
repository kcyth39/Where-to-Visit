export type CandidateUrlError =
  | "invalid_format"
  | "credentials"
  | "too_long";

export type CandidateUrlResult =
  | { value: string | null; error: null }
  | { value: null; error: CandidateUrlError };

export const CANDIDATE_URL_ERROR_MESSAGES: Record<CandidateUrlError, string> = {
  invalid_format:
    "リンクは http:// または https:// から始まるURLを入力してください。",
  credentials: "ユーザー名やパスワードを含むリンクは保存できません。",
  too_long: "リンクは4096バイト以内で入力してください。"
};

const ABSOLUTE_HTTP_PREFIX = /^https?:\/\//i;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const MAX_URL_BYTES = 4096;

export function normalizeCandidateUrl(
  rawValue: string | null | undefined
): CandidateUrlResult {
  const raw = rawValue ?? "";
  if (CONTROL_CHARACTER.test(raw)) {
    return { value: null, error: "invalid_format" };
  }

  const value = raw.trim();
  if (!value) return { value: null, error: null };

  if (!ABSOLUTE_HTTP_PREFIX.test(value)) {
    return { value: null, error: "invalid_format" };
  }

  const authority = value.slice(value.indexOf("://") + 3).split(/[/?#]/, 1)[0];
  if (!authority) return { value: null, error: "invalid_format" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { value: null, error: "invalid_format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { value: null, error: "invalid_format" };
  }
  if (parsed.username || parsed.password) {
    return { value: null, error: "credentials" };
  }

  const normalized = parsed.href;
  if (new TextEncoder().encode(normalized).byteLength > MAX_URL_BYTES) {
    return { value: null, error: "too_long" };
  }

  return { value: normalized, error: null };
}

export function candidateUrlErrorMessage(error: CandidateUrlError): string {
  return CANDIDATE_URL_ERROR_MESSAGES[error];
}
