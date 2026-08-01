"use client";

import { useEffect, useState } from "react";

import {
  clearEventHistory,
  EVENT_HISTORY_RECENT_ENTRIES,
  type EventHistoryEntryV1,
  readEventHistory,
  recordEventHistory,
  removeEventHistoryEntry
} from "@/lib/event-history";

type HistoryState =
  | { status: "neutral" }
  | { status: "ready"; entries: EventHistoryEntryV1[] }
  | { status: "unavailable" };

type EventHistoryProps = {
  mode: "recent" | "all";
};

type LocalStorageAccess =
  | { status: "available"; storage: Storage }
  | { status: "unavailable" };

function getLocalStorageSafely(): LocalStorageAccess {
  try {
    return { status: "available", storage: window.localStorage };
  } catch {
    return { status: "unavailable" };
  }
}

export function EventHistory({ mode }: EventHistoryProps) {
  const [history, setHistory] = useState<HistoryState>({ status: "neutral" });
  const [operationMessage, setOperationMessage] = useState<string | null>(null);

  useEffect(() => {
    const storageAccess = getLocalStorageSafely();
    if (storageAccess.status === "unavailable") {
      setHistory({ status: "unavailable" });
      return;
    }
    const result = readEventHistory(storageAccess.storage);
    setHistory(result.status === "ready" ? result : { status: "unavailable" });
  }, []);

  const entries =
    history.status === "ready"
      ? history.entries.slice(0, mode === "recent" ? EVENT_HISTORY_RECENT_ENTRIES : undefined)
      : [];

  function removeEntry(pathname: string) {
    if (history.status !== "ready") return;
    const storageAccess = getLocalStorageSafely();
    if (
      storageAccess.status === "available" &&
      removeEventHistoryEntry(storageAccess.storage, pathname)
    ) {
      setOperationMessage(null);
      setHistory({
        status: "ready",
        entries: history.entries.filter((entry) => entry.pathname !== pathname)
      });
    } else {
      setOperationMessage("履歴を削除できませんでした。イベントの閲覧や編集はそのまま利用できます。");
    }
  }

  function removeAll() {
    if (history.status !== "ready") return;
    if (!window.confirm("このブラウザのきめごと履歴をすべて削除しますか？")) return;
    const storageAccess = getLocalStorageSafely();
    if (storageAccess.status === "available" && clearEventHistory(storageAccess.storage)) {
      setOperationMessage(null);
      setHistory({ status: "ready", entries: [] });
    } else {
      setOperationMessage("履歴を削除できませんでした。イベントの閲覧や編集はそのまま利用できます。");
    }
  }

  const title = mode === "recent" ? "きめごと" : "きめごと一覧";
  return (
    <section aria-labelledby={`event-history-${mode}`} className="event-history">
      <div className="event-history-heading">
        <h2 id={`event-history-${mode}`}>{title}</h2>
        {mode === "recent" && history.status === "ready" && history.entries.length > 0 ? (
          <a className="event-history-all-link" href="/history">
            すべて見る
          </a>
        ) : null}
      </div>

      {history.status === "neutral" ? <div className="event-history-neutral" aria-hidden="true" /> : null}
      {history.status === "unavailable" ? (
        <p className="event-history-message">
          このブラウザでは履歴を利用できません。イベントの閲覧や編集はそのまま利用できます。
        </p>
      ) : null}
      {operationMessage ? (
        <p className="event-history-message" role="alert">
          {operationMessage}
        </p>
      ) : null}
      {history.status === "ready" && entries.length === 0 ? (
        <p className="event-history-message">このブラウザのきめごとはまだありません。</p>
      ) : null}
      {history.status === "ready" && entries.length > 0 ? (
        <>
          <ul className="event-history-list">
            {entries.map((entry) => (
              <li className="event-history-entry" key={entry.pathname}>
                <a href={entry.pathname}>{entry.title}</a>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => removeEntry(entry.pathname)}
                >
                  履歴から削除
                </button>
              </li>
            ))}
          </ul>
          {mode === "all" ? (
            <button className="text-button" type="button" onClick={removeAll}>
              すべての履歴を削除
            </button>
          ) : null}
        </>
      ) : null}
      <p className="event-history-note">
        この履歴はこのブラウザだけに保存されます。共有のブラウザでは他の人にも見えることがあります。履歴を削除しても、イベント本体は削除されません。
      </p>
    </section>
  );
}

type EventHistoryRecorderProps = {
  pathname: string;
  title: string;
};

export function EventHistoryRecorder({ pathname, title }: EventHistoryRecorderProps) {
  useEffect(() => {
    const storageAccess = getLocalStorageSafely();
    if (storageAccess.status === "available") {
      recordEventHistory(storageAccess.storage, pathname, title);
    }
  }, [pathname, title]);

  return null;
}
