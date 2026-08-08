export const MEMO_MAX_LENGTH = 1000;

export type MemoNormalizationResult =
  | { status: "absent" }
  | { status: "ready"; value: string | null; scalarLength: number }
  | {
      status: "invalid";
      reason: "unpaired_surrogate" | "too_long";
      scalarLength?: number;
    };

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return true;
  }
  return false;
}
export function normalizeMemo(
  input: string | null | undefined
): MemoNormalizationResult {
  if (input === undefined) return { status: "absent" };

  const normalized = (input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!normalized) {
    return { status: "ready", value: null, scalarLength: 0 };
  }
  if (hasUnpairedSurrogate(normalized)) {
    return { status: "invalid", reason: "unpaired_surrogate" };
  }

  const scalarLength = Array.from(normalized).length;
  if (scalarLength > MEMO_MAX_LENGTH) {
    return { status: "invalid", reason: "too_long", scalarLength };
  }

  return { status: "ready", value: normalized, scalarLength };
}
