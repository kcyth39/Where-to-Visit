export const EVENT_HISTORY_KEY = "kimenosuke:event-history:v1";
export const EVENT_HISTORY_VERSION = 1;
export const EVENT_HISTORY_TTL_MS = 15_552_000_000;
export const EVENT_HISTORY_FUTURE_SKEW_MS = 300_000;
export const EVENT_HISTORY_MAX_ENTRIES = 30;
export const EVENT_HISTORY_RECENT_ENTRIES = 2;

const canonicalPathnamePattern = /^\/e\/[A-Za-z0-9_-]{43}$/;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type EventHistoryEntryV1 = {
  pathname: string;
  title: string;
  lastVisitedAt: string;
  expiresAt: string;
};

export type EventHistoryPayloadV1 = {
  version: 1;
  entries: EventHistoryEntryV1[];
};

export type HistoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type EventHistoryReadResult =
  | { status: "ready"; entries: EventHistoryEntryV1[] }
  | { status: "unavailable" };

type SanitizedHistory = {
  entries: EventHistoryEntryV1[];
  changed: boolean;
};

type SanitizedEntry = {
  entry: EventHistoryEntryV1;
  changed: boolean;
};

function isExactIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !isoTimestampPattern.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validDate(value: unknown): number | null {
  if (!isExactIsoTimestamp(value)) return null;
  return Date.parse(value);
}

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

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === keys.length && actualKeys.every((key, index) => key === keys[index]);
}

export function normalizeEventHistoryTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  return !hasUnpairedSurrogate(title) &&
    Array.from(title).length >= 1 &&
    Array.from(title).length <= 80
    ? title
    : null;
}

export function isCanonicalEventPathname(value: unknown): value is string {
  return typeof value === "string" && canonicalPathnamePattern.test(value);
}

export function canonicalEventPathname(shareToken: unknown): string | null {
  if (typeof shareToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(shareToken)) {
    return null;
  }
  return `/e/${shareToken}`;
}

function entryFromUnknown(value: unknown, now: number): SanitizedEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (
    !hasExactKeys(entry, ["expiresAt", "lastVisitedAt", "pathname", "title"]) ||
    !isCanonicalEventPathname(entry.pathname) ||
    !normalizeEventHistoryTitle(entry.title) ||
    !isExactIsoTimestamp(entry.lastVisitedAt) ||
    !isExactIsoTimestamp(entry.expiresAt)
  ) {
    return null;
  }

  const title = normalizeEventHistoryTitle(entry.title);
  const lastVisited = validDate(entry.lastVisitedAt);
  const expiresAt = validDate(entry.expiresAt);
  if (lastVisited === null || expiresAt === null || lastVisited > now + EVENT_HISTORY_FUTURE_SKEW_MS) {
    return null;
  }

  if (expiresAt !== lastVisited + EVENT_HISTORY_TTL_MS || expiresAt <= now) return null;

  const normalized = lastVisited > now;
  const effectiveLastVisited = normalized ? now : lastVisited;
  const effectiveExpiresAt = normalized ? now + EVENT_HISTORY_TTL_MS : expiresAt;

  return {
    entry: {
      pathname: entry.pathname,
      title: title!,
      lastVisitedAt: new Date(effectiveLastVisited).toISOString(),
      expiresAt: new Date(effectiveExpiresAt).toISOString()
    },
    changed: normalized || title !== entry.title
  };
}

function compareEntries(left: EventHistoryEntryV1, right: EventHistoryEntryV1): number {
  const byVisited = Date.parse(right.lastVisitedAt) - Date.parse(left.lastVisitedAt);
  if (byVisited) return byVisited;
  return left.pathname < right.pathname ? -1 : left.pathname > right.pathname ? 1 : 0;
}

function compareTitleCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left);
  const rightPoints = Array.from(right);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const leftPoint = leftPoints[index].codePointAt(0)!;
    const rightPoint = rightPoints[index].codePointAt(0)!;
    if (leftPoint !== rightPoint) return leftPoint - rightPoint;
  }
  return leftPoints.length - rightPoints.length;
}

function compareDuplicateSelection(left: EventHistoryEntryV1, right: EventHistoryEntryV1): number {
  const byVisited = Date.parse(right.lastVisitedAt) - Date.parse(left.lastVisitedAt);
  return byVisited || compareTitleCodePoints(left.title, right.title);
}

function sanitizePayload(value: unknown, now: number): SanitizedHistory {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { entries: [], changed: true };
  }
  const payload = value as Record<string, unknown>;
  if (
    !hasExactKeys(payload, ["entries", "version"]) ||
    payload.version !== EVENT_HISTORY_VERSION ||
    !Array.isArray(payload.entries)
  ) {
    return { entries: [], changed: true };
  }

  const newestByPathname = new Map<string, EventHistoryEntryV1>();
  let changed = false;
  for (const rawEntry of payload.entries) {
    const sanitizedEntry = entryFromUnknown(rawEntry, now);
    if (!sanitizedEntry) {
      changed = true;
      continue;
    }
    const { entry } = sanitizedEntry;
    if (sanitizedEntry.changed) changed = true;
    const existing = newestByPathname.get(entry.pathname);
    if (!existing || compareDuplicateSelection(entry, existing) < 0) {
      if (existing) changed = true;
      newestByPathname.set(entry.pathname, entry);
    } else {
      changed = true;
    }
  }

  const entries = [...newestByPathname.values()]
    .sort(compareEntries)
    .slice(0, EVENT_HISTORY_MAX_ENTRIES);
  if (entries.length !== payload.entries.length) changed = true;
  return { entries, changed };
}

function serialize(entries: EventHistoryEntryV1[]): string {
  const payload: EventHistoryPayloadV1 = {
    version: EVENT_HISTORY_VERSION,
    entries
  };
  return JSON.stringify(payload);
}

function persistSanitized(storage: HistoryStorage, entries: EventHistoryEntryV1[]): boolean {
  try {
    if (entries.length === 0) storage.removeItem(EVENT_HISTORY_KEY);
    else storage.setItem(EVENT_HISTORY_KEY, serialize(entries));
    return true;
  } catch {
    return false;
  }
}

export function readEventHistory(
  storage: HistoryStorage,
  now = Date.now()
): EventHistoryReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(EVENT_HISTORY_KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (raw === null) return { status: "ready", entries: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    persistSanitized(storage, []);
    return { status: "ready", entries: [] };
  }

  const sanitized = sanitizePayload(parsed, now);
  if (sanitized.changed) persistSanitized(storage, sanitized.entries);
  return { status: "ready", entries: sanitized.entries };
}

export function recordEventHistory(
  storage: HistoryStorage,
  pathname: unknown,
  title: unknown,
  now = Date.now()
): boolean {
  if (!isCanonicalEventPathname(pathname) || !normalizeEventHistoryTitle(title)) return false;
  const current = readEventHistory(storage, now);
  if (current.status !== "ready") return false;

  const entry: EventHistoryEntryV1 = {
    pathname,
    title: normalizeEventHistoryTitle(title)!,
    lastVisitedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + EVENT_HISTORY_TTL_MS).toISOString()
  };
  const entries = [entry, ...current.entries.filter((item) => item.pathname !== pathname)]
    .sort(compareEntries)
    .slice(0, EVENT_HISTORY_MAX_ENTRIES);
  return persistSanitized(storage, entries);
}

export function removeEventHistoryEntry(
  storage: HistoryStorage,
  pathname: unknown,
  now = Date.now()
): boolean {
  if (!isCanonicalEventPathname(pathname)) return false;
  const current = readEventHistory(storage, now);
  if (current.status !== "ready") return false;
  return persistSanitized(
    storage,
    current.entries.filter((entry) => entry.pathname !== pathname)
  );
}

export function clearEventHistory(storage: HistoryStorage): boolean {
  return persistSanitized(storage, []);
}
