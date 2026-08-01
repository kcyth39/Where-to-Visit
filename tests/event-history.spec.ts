import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  canonicalEventPathname,
  clearEventHistory,
  EVENT_HISTORY_FUTURE_SKEW_MS,
  EVENT_HISTORY_KEY,
  EVENT_HISTORY_MAX_ENTRIES,
  EVENT_HISTORY_TTL_MS,
  isCanonicalEventPathname,
  normalizeEventHistoryTitle,
  readEventHistory,
  recordEventHistory,
  removeEventHistoryEntry,
  type HistoryStorage
} from "../src/lib/event-history";

test.use({ trace: "off", video: "off", screenshot: "off" });
test.describe.configure({ retries: 0 });

const syntheticToken = "a".repeat(43);
const syntheticPathname = `/e/${syntheticToken}`;

function storage(initial: string | null = null): HistoryStorage & { value: string | null } {
  return {
    value: initial,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
    removeItem() {
      this.value = null;
    }
  };
}

function historyPayload(title: string) {
  const now = Date.now();
  return {
    version: 1,
    entries: [
      {
        pathname: syntheticPathname,
        title,
        lastVisitedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + EVENT_HISTORY_TTL_MS).toISOString()
      }
    ]
  };
}

function historyEntry(pathname: string, title: string, lastVisitedAt: number) {
  return {
    pathname,
    title,
    lastVisitedAt: new Date(lastVisitedAt).toISOString(),
    expiresAt: new Date(lastVisitedAt + EVENT_HISTORY_TTL_MS).toISOString()
  };
}

async function seedGetterControlledStorage(
  page: Page,
  title: string
) {
  await page.addInitScript(
    ({ key, payload }: { key: string; payload: ReturnType<typeof historyPayload> }) => {
      const storage = window.localStorage;
      storage.setItem(key, JSON.stringify(payload));
      let unavailable = false;
      let accesses = 0;
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          accesses += 1;
          if (unavailable) throw new DOMException("blocked", "SecurityError");
          return storage;
        }
      });
      Object.defineProperty(window, "__n6HistoryStorageGate", {
        configurable: true,
        value: {
          disable() {
            unavailable = true;
          },
          accesses() {
            return accesses;
          }
        }
      });
    },
    { key: EVENT_HISTORY_KEY, payload: historyPayload(title) }
  );
}

async function disableHistoryStorageGetter(page: Page) {
  await page.evaluate(() => {
    (window as typeof window & {
      __n6HistoryStorageGate: { disable(): void };
    }).__n6HistoryStorageGate.disable();
  });
}

function sourceBody(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error("Expected EventApp storage boundary was not found.");
  return source.slice(start + startMarker.length, end);
}

function executeEventAppStorageBody(body: string, context: Record<string, unknown>) {
  return new Function("context", `with (context) {${body}}`)(context);
}

test.describe("N6 browser history pure contract", () => {
  test("validates canonical pathnames and rejects capability-bearing alternatives", () => {
    expect(canonicalEventPathname(syntheticToken)).toBe(syntheticPathname);
    expect(isCanonicalEventPathname(syntheticPathname)).toBe(true);
    expect(isCanonicalEventPathname(`/e/${"a".repeat(42)}`)).toBe(false);
    expect(isCanonicalEventPathname(`/e/${"a".repeat(42)}!`)).toBe(false);
    expect(isCanonicalEventPathname(`https://example.test${syntheticPathname}`)).toBe(false);
    expect(isCanonicalEventPathname(`${syntheticPathname}?created=1`)).toBe(false);
    expect(isCanonicalEventPathname(`${syntheticPathname}#fragment`)).toBe(false);
    expect(isCanonicalEventPathname(syntheticToken)).toBe(false);
    expect(canonicalEventPathname(`${syntheticToken}?created=1`)).toBeNull();
  });

  test("normalizes titles by trim and Unicode scalar count without HTML interpretation", () => {
    expect(normalizeEventHistoryTitle("  きめごと  ")).toBe("きめごと");
    expect(normalizeEventHistoryTitle(" \n\t ")).toBeNull();
    expect(normalizeEventHistoryTitle("😀")).toBe("😀");
    expect(normalizeEventHistoryTitle("😀".repeat(80))).toBe("😀".repeat(80));
    expect(normalizeEventHistoryTitle("😀".repeat(81))).toBeNull();
    expect(normalizeEventHistoryTitle("<strong>plain data</strong>")).toBe(
      "<strong>plain data</strong>"
    );
    expect(normalizeEventHistoryTitle("\ud800")).toBeNull();
    expect(normalizeEventHistoryTitle("\udc00")).toBeNull();
  });

  test("records only the allowed payload fields and upserts the same pathname", () => {
    const target = storage();
    expect(recordEventHistory(target, syntheticPathname, "きめごと", 1_000)).toBe(true);
    expect(recordEventHistory(target, syntheticPathname, "更新したきめごと", 2_000)).toBe(true);
    const payload = JSON.parse(target.value!) as { entries: Array<Record<string, unknown>> };
    expect(payload.entries).toHaveLength(1);
    expect(Object.keys(payload.entries[0]).sort()).toEqual([
      "expiresAt",
      "lastVisitedAt",
      "pathname",
      "title"
    ]);
    expect(payload.entries[0].title).toBe("更新したきめごと");
  });

  test("purges malformed, expired, future, duplicate, and overflow entries deterministically", () => {
    const now = Date.now();
    const path = (index: number) =>
      `/e/${`${index.toString(36)}a`.padEnd(43, "a")}`;
    const valid = (pathname: string, visitedAt: number) => ({
      pathname,
      title: "きめごと",
      lastVisitedAt: new Date(visitedAt).toISOString(),
      expiresAt: new Date(visitedAt + EVENT_HISTORY_TTL_MS).toISOString()
    });
    const target = storage(
      JSON.stringify({
        version: 1,
        entries: [
          ...Array.from({ length: EVENT_HISTORY_MAX_ENTRIES + 1 }, (_, index) =>
            valid(path(index), now - index)
          ),
          valid(path(0), now - 999),
          valid(path(1), now + 300_001),
          { pathname: "/e/not-valid", title: "きめごと" },
          { ...valid(path(40), now), eventId: "not-allowed" },
          valid(path(2), now - EVENT_HISTORY_TTL_MS - 1)
        ]
      })
    );
    const result = readEventHistory(target, now);
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.entries).toHaveLength(EVENT_HISTORY_MAX_ENTRIES);
      expect(result.entries[0].pathname).toBe(path(0));
      expect(new Set(result.entries.map((entry) => entry.pathname)).size).toBe(
        EVENT_HISTORY_MAX_ENTRIES
      );
      expect(result.entries.map((entry) => entry.pathname)).not.toContain(path(40));
    }
  });

  test("repairs valid future skew and purges invalid timestamp pairs", () => {
    const now = 1_000_000;
    const withinSkew = historyEntry(syntheticPathname, "未来のきめごと", now + EVENT_HISTORY_FUTURE_SKEW_MS);
    const target = storage(JSON.stringify({ version: 1, entries: [withinSkew] }));

    const normalized = readEventHistory(target, now);
    expect(normalized.status).toBe("ready");
    if (normalized.status === "ready") {
      expect(normalized.entries).toEqual([
        {
          ...withinSkew,
          lastVisitedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + EVENT_HISTORY_TTL_MS).toISOString()
        }
      ]);
    }
    expect(target.value).toContain(new Date(now).toISOString());

    const overSkew = historyEntry(syntheticPathname, "未来のきめごと", now + EVENT_HISTORY_FUTURE_SKEW_MS + 1);
    const mismatchedPair = {
      ...historyEntry(syntheticPathname, "未来のきめごと", now + 1),
      expiresAt: new Date(now + EVENT_HISTORY_TTL_MS).toISOString()
    };
    for (const entry of [overSkew, mismatchedPair]) {
      const result = readEventHistory(storage(JSON.stringify({ version: 1, entries: [entry] })), now);
      expect(result).toEqual({ status: "ready", entries: [] });
    }
  });

  test("repairs duplicate pathnames deterministically by visit time then title code points", () => {
    const now = 1_000_000;
    const later = historyEntry(syntheticPathname, "later", now - 1);
    const earlier = historyEntry(syntheticPathname, "earlier", now - 2);
    const newerResult = readEventHistory(
      storage(JSON.stringify({ version: 1, entries: [earlier, later] })),
      now
    );
    expect(newerResult).toMatchObject({ status: "ready", entries: [later] });

    const titleA = historyEntry(syntheticPathname, "😀", now - 3);
    const titleB = historyEntry(syntheticPathname, "𐀀", now - 3);
    const forward = readEventHistory(
      storage(JSON.stringify({ version: 1, entries: [titleA, titleB] })),
      now
    );
    const reversed = readEventHistory(
      storage(JSON.stringify({ version: 1, entries: [titleB, titleA] })),
      now
    );
    expect(forward).toMatchObject({ status: "ready", entries: [titleB] });
    expect(reversed).toEqual(forward);
  });

  test("sanitizes malformed roots, versions, timestamps, and expired entries", () => {
    const now = 1_000_000;
    const valid = historyEntry(syntheticPathname, "確認するきめごと", now - 1);
    const invalidTimestamp = { ...valid, lastVisitedAt: "not-a-timestamp" };
    const expired = historyEntry(
      syntheticPathname,
      "期限切れのきめごと",
      now - EVENT_HISTORY_TTL_MS - 1
    );
    for (const payload of [
      [],
      { version: 2, entries: [valid] },
      { version: 1, entries: [invalidTimestamp] },
      { version: 1, entries: [expired] }
    ]) {
      expect(readEventHistory(storage(JSON.stringify(payload)), now)).toEqual({
        status: "ready",
        entries: []
      });
    }
  });

  test("uses a sliding 180 day expiration", () => {
    const target = storage();
    expect(recordEventHistory(target, syntheticPathname, "きめごと", 5_000)).toBe(true);
    const first = readEventHistory(target, 5_000);
    expect(first).toMatchObject({ status: "ready" });
    expect(recordEventHistory(target, syntheticPathname, "きめごと", 6_000)).toBe(true);
    const second = readEventHistory(target, 6_000);
    if (second.status === "ready") {
      expect(second.entries[0].expiresAt).toBe(
        new Date(6_000 + EVENT_HISTORY_TTL_MS).toISOString()
      );
    }
  });

  test("uses canonical pathname order when visit times are equal", () => {
    const target = storage();
    const first = `/e/${"b".repeat(43)}`;
    const second = `/e/${"a".repeat(43)}`;
    expect(recordEventHistory(target, first, "きめごと", 5_000)).toBe(true);
    expect(recordEventHistory(target, second, "きめごと", 5_000)).toBe(true);
    const result = readEventHistory(target, 5_000);
    if (result.status === "ready") {
      expect(result.entries.map((entry) => entry.pathname)).toEqual([second, first]);
    }
  });

  test("distinguishes unavailable storage and preserves other storage keys", () => {
    const unavailable: HistoryStorage = {
      getItem() {
        throw new Error("unavailable");
      },
      setItem() {
        throw new Error("unavailable");
      },
      removeItem() {
        throw new Error("unavailable");
      }
    };
    expect(readEventHistory(unavailable)).toEqual({ status: "unavailable" });
    expect(recordEventHistory(unavailable, syntheticPathname, "きめごと")).toBe(false);
    expect(removeEventHistoryEntry(unavailable, syntheticPathname)).toBe(false);
  });

  test("keeps read results available when repair writes fail", () => {
    const malformedCleanupFailure: HistoryStorage = {
      getItem() {
        return "{";
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      }
    };
    expect(readEventHistory(malformedCleanupFailure)).toEqual({ status: "ready", entries: [] });

    const validEntry = historyEntry(syntheticPathname, "読取を維持するきめごと", 1_000);
    const setItemFailure: HistoryStorage = {
      getItem() {
        return JSON.stringify({ version: 1, entries: [validEntry] });
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      }
    };
    expect(readEventHistory(setItemFailure, 1_000)).toMatchObject({
      status: "ready",
      entries: [validEntry]
    });
    expect(recordEventHistory(setItemFailure, syntheticPathname, "更新", 2_000)).toBe(false);
  });

  test("removes only the history key and never clears browser storage", () => {
    const target = storage();
    expect(recordEventHistory(target, syntheticPathname, "きめごと", 1_000)).toBe(true);
    expect(removeEventHistoryEntry(target, syntheticPathname, 1_000)).toBe(true);
    expect(target.value).toBeNull();
    expect(clearEventHistory(target)).toBe(true);
    expect(EVENT_HISTORY_KEY).toBe("kimenosuke:event-history:v1");
  });

  test("shows recent browser-local entries on top and the complete list separately", async ({
    page
  }) => {
    const now = Date.now();
    const entries = [0, 1, 2].map((index) => ({
      pathname: `/e/${`${index.toString(36)}b`.padEnd(43, "b")}`,
      title: `保存済みのきめごと ${index + 1}`,
      lastVisitedAt: new Date(now - index).toISOString(),
      expiresAt: new Date(now + EVENT_HISTORY_TTL_MS - index).toISOString()
    }));
    await page.addInitScript(
      ({ key, payload }) => window.localStorage.setItem(key, JSON.stringify(payload)),
      { key: EVENT_HISTORY_KEY, payload: { version: 1, entries } }
    );

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "きめごと", exact: true })).toBeVisible();
    await expect(page.getByText("保存済みのきめごと 1")).toBeVisible();
    await expect(page.getByText("保存済みのきめごと 2")).toBeVisible();
    await expect(page.getByText("保存済みのきめごと 3")).toHaveCount(0);
    await page.getByRole("link", { name: "すべて見る" }).click();

    await expect(
      page.getByRole("heading", { name: "きめごと一覧", level: 1 })
    ).toBeVisible();
    await expect(page.getByText("保存済みのきめごと 3")).toBeVisible();
  });

  test("renders HTML-like titles as text rather than markup", async ({ page }) => {
    await page.addInitScript(
      ({ key, payload }) => window.localStorage.setItem(key, JSON.stringify(payload)),
      {
        key: EVENT_HISTORY_KEY,
        payload: { version: 1, entries: [historyEntry(syntheticPathname, "<b>履歴</b>", Date.now())] }
      }
    );

    await page.goto("/history");
    await expect(page.getByText("<b>履歴</b>", { exact: true })).toBeVisible();
    await expect(page.locator(".event-history b")).toHaveCount(0);
  });

  test("keeps the history visible and reports a generic failure when deletion is unavailable", async ({
    page
  }) => {
    const now = Date.now();
    const entry = {
      pathname: syntheticPathname,
      title: "削除できないきめごと",
      lastVisitedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + EVENT_HISTORY_TTL_MS).toISOString()
    };
    await page.addInitScript(
      ({ key, payload }) => {
        window.localStorage.setItem(key, JSON.stringify(payload));
        const removeItem = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function (storageKey) {
          if (storageKey === key) throw new Error("unavailable");
          return removeItem.call(this, storageKey);
        };
      },
      { key: EVENT_HISTORY_KEY, payload: { version: 1, entries: [entry] } }
    );

    await page.goto("/history");
    await page.getByRole("button", { name: "履歴から削除" }).click();
    await expect(page.locator(".event-history").getByRole("alert")).toHaveText(
      "履歴を削除できませんでした。イベントの閲覧や編集はそのまま利用できます。"
    );
    await expect(page.getByText("削除できないきめごと")).toBeVisible();
  });

  test("treats a local storage getter exception as unavailable without retrying", async ({ page }) => {
    await page.addInitScript(() => {
      let accesses = 0;
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          accesses += 1;
          throw new DOMException("blocked", "SecurityError");
        }
      });
      Object.defineProperty(window, "__n6HistoryGetterAccesses", {
        configurable: true,
        value: () => accesses
      });
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "みんなに聞いてみよう！" })).toBeVisible();
    await expect(
      page.getByText("このブラウザでは履歴を利用できません。イベントの閲覧や編集はそのまま利用できます。")
    ).toBeVisible();
    const initialAccesses = await page.evaluate(
      () => (window as typeof window & { __n6HistoryGetterAccesses(): number }).__n6HistoryGetterAccesses()
    );
    await page.waitForTimeout(50);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as typeof window & {
              __n6HistoryGetterAccesses(): number;
            }).__n6HistoryGetterAccesses()
        )
      )
      .toBe(initialAccesses);
  });

  test("keeps the confirmed entry when an individual delete cannot access storage", async ({
    page
  }) => {
    await seedGetterControlledStorage(page, "削除を確認するきめごと");
    await page.goto("/history");
    await expect(page.getByText("削除を確認するきめごと")).toBeVisible();
    await disableHistoryStorageGetter(page);

    await page.getByRole("button", { name: "履歴から削除" }).click();
    await expect(page.locator(".event-history").getByRole("alert")).toHaveText(
      "履歴を削除できませんでした。イベントの閲覧や編集はそのまま利用できます。"
    );
    await expect(page.getByText("削除を確認するきめごと")).toBeVisible();
  });

  test("keeps the confirmed entries when remove-all cannot access storage", async ({ page }) => {
    await seedGetterControlledStorage(page, "全削除を確認するきめごと");
    await page.goto("/history");
    await expect(page.getByText("全削除を確認するきめごと")).toBeVisible();
    await disableHistoryStorageGetter(page);
    page.once("dialog", (dialog) => dialog.accept());

    await page.getByRole("button", { name: "すべての履歴を削除" }).click();
    await expect(page.locator(".event-history").getByRole("alert")).toHaveText(
      "履歴を削除できませんでした。イベントの閲覧や編集はそのまま利用できます。"
    );
    await expect(page.getByText("全削除を確認するきめごと")).toBeVisible();
  });

  test("keeps history controls readable and operable at supported viewports", async ({ browser }) => {
    const now = Date.now();
    const entries = [0, 1].map((index) =>
      historyEntry(
        `/e/${`${index.toString(36)}c`.padEnd(43, "c")}`,
        `操作を確認する履歴 ${index + 1}`,
        now - index
      )
    );

    for (const viewport of [
      { width: 320, height: 812 },
      { width: 375, height: 812 },
      { width: 1366, height: 768 }
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.addInitScript(
        ({ key, payload }) => window.localStorage.setItem(key, JSON.stringify(payload)),
        { key: EVENT_HISTORY_KEY, payload: { version: 1, entries } }
      );
      await page.goto("/history");

      await expect(page.getByRole("link", { name: "きめのすけ" })).toBeVisible();
      await expect(page.getByText("この履歴はこのブラウザだけに保存されます。", { exact: false })).toBeVisible();
      await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);

      const removeOne = page.getByRole("button", { name: "履歴から削除" }).first();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(removeOne).toBeFocused();
      await expect(removeOne.evaluate((element) => element.matches(":focus-visible"))).resolves.toBe(true);
      await removeOne.click();
      await expect(page.getByText("操作を確認する履歴 1")).toHaveCount(0);

      page.once("dialog", (dialog) => dialog.accept());
      await page.getByRole("button", { name: "すべての履歴を削除" }).click();
      await expect(page.getByText("このブラウザのきめごとはまだありません。")).toBeVisible();
      await context.close();
    }
  });

  test("keeps storage access client-only and executes selected participant storage failure boundaries", () => {
    const historySource = readFileSync(join(process.cwd(), "src/lib/event-history.ts"), "utf8");
    const componentSource = readFileSync(join(process.cwd(), "src/components/EventHistory.tsx"), "utf8");
    const eventAppSource = readFileSync(join(process.cwd(), "src/components/EventApp.tsx"), "utf8");
    expect(historySource).not.toMatch(/window\.|localStorage/);
    expect(`${historySource}\n${componentSource}`).not.toMatch(/console\.|analytics|telemetry/);
    expect(componentSource).toMatch(/useEffect/);
    expect(componentSource).toMatch(/getLocalStorageSafely/);
    expect(componentSource).not.toMatch(/recordEventHistory\(window\.localStorage/);
    expect(eventAppSource).not.toMatch(/localStorage\.clear/);

    const storeSelectionBody = sourceBody(
      eventAppSource,
      "function storeSelection(participantId: string | null) {",
      "\n  }\n\n  function completePending"
    );
    const restoreSelectionAnchor = "useEffect(() => {\n    try {\n      const stored = localStorage.getItem(storageKey);";
    const restoreSelectionStart = eventAppSource.indexOf(restoreSelectionAnchor);
    const restoreSelectionEnd = eventAppSource.indexOf(
      "\n  }, [storageKey]);",
      restoreSelectionStart
    );
    if (restoreSelectionStart === -1 || restoreSelectionEnd === -1) {
      throw new Error("Expected EventApp restore boundary was not found.");
    }
    const restoreSelectionBody = eventAppSource.slice(
      restoreSelectionStart + "useEffect(() => {".length,
      restoreSelectionEnd
    );
    const storageKey = "kimenosuke:selected-participant:synthetic-event";
    const selections: Array<string | null> = [];
    let selectionReady = false;

    expect(() =>
      executeEventAppStorageBody(restoreSelectionBody, {
        storageKey,
        state: { participants: [] },
        setSelectedParticipantId: (value: string | null) => selections.push(value),
        setDraftName: () => undefined,
        setSelectionReady: (value: boolean) => {
          selectionReady = value;
        },
        get localStorage() {
          throw new Error("blocked");
        }
      })
    ).not.toThrow();
    expect(selections).toEqual([null]);
    expect(selectionReady).toBe(true);

    let selected: string | null = null;
    const unavailableStorage = {
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      }
    };
    expect(() =>
      executeEventAppStorageBody(storeSelectionBody, {
        participantId: "participant-1",
        storageKey,
        setSelectedParticipantId: (value: string | null) => {
          selected = value;
        },
        localStorage: unavailableStorage
      })
    ).not.toThrow();
    expect(selected).toBe("participant-1");

    expect(() =>
      executeEventAppStorageBody(storeSelectionBody, {
        participantId: null,
        storageKey,
        setSelectedParticipantId: (value: string | null) => {
          selected = value;
        },
        get localStorage() {
          throw new Error("blocked");
        }
      })
    ).not.toThrow();
    expect(selected).toBeNull();

    const persisted: Array<[string, string | null]> = [];
    executeEventAppStorageBody(storeSelectionBody, {
      participantId: "participant-2",
      storageKey,
      setSelectedParticipantId: (value: string | null) => {
        selected = value;
      },
      localStorage: {
        setItem(key: string, value: string) {
          persisted.push([key, value]);
        },
        removeItem(key: string) {
          persisted.push([key, null]);
        }
      }
    });
    executeEventAppStorageBody(storeSelectionBody, {
      participantId: null,
      storageKey,
      setSelectedParticipantId: (value: string | null) => {
        selected = value;
      },
      localStorage: {
        setItem(key: string, value: string) {
          persisted.push([key, value]);
        },
        removeItem(key: string) {
          persisted.push([key, null]);
        }
      }
    });
    expect(selected).toBeNull();
    expect(persisted).toEqual([
      [storageKey, "participant-2"],
      [storageKey, null]
    ]);
  });
});
