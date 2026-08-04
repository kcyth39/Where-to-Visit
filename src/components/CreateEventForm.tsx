"use client";

import { useState } from "react";

import { EVENT_TITLE_PLACEHOLDER } from "@/lib/constants";
import type { CreateEventRouteResult } from "@/lib/event-types";
import { MEMO_MAX_LENGTH, normalizeMemo } from "@/lib/memo";

const CREATE_FAILED_MESSAGE = "イベントを作成できませんでした。";
const MEMO_TOO_LONG_MESSAGE = "つたえたいことは1000文字までです。";
const RATE_LIMITED_MESSAGE =
  "短時間に多くのきめごとが作成されました。しばらくしてからもう一度お試しください。";
const OUTCOME_UNKNOWN_MESSAGE =
  "作成結果を確認できませんでした。自動では再試行していません。もう一度作ると別の「きめたいこと」が作成される場合があります。";

function isCreateEventRouteResult(
  value: unknown
): value is CreateEventRouteResult {
  if (!value || typeof value !== "object" || !("status" in value)) {
    return false;
  }
  const status = (value as { status?: unknown }).status;
  if (status === "failed" || status === "outcome_unknown") return true;
  if (status === "created") {
    const path = (value as { path?: unknown }).path;
    return (
      typeof path === "string" &&
      /^\/e\/[A-Za-z0-9_-]{43}\?created=1$/.test(path)
    );
  }
  return (
    status === "invalid" &&
    ((value as { field?: unknown }).field === "title" ||
      (value as { field?: unknown }).field === "memo")
  );
}

export function CreateEventForm() {
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    memo: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const formDisabled = pending || confirmation !== null;
  const memoResult = normalizeMemo(memo);
  const memoLength =
    memoResult.status === "ready"
      ? memoResult.scalarLength
      : memoResult.status === "invalid" &&
          memoResult.reason === "too_long"
        ? memoResult.scalarLength ?? 0
        : Array.from(memo).length;

  function prepareCreation() {
    const normalizedTitle = title.trim();
    if (
      !normalizedTitle ||
      Array.from(normalizedTitle).length > 80
    ) {
      setMessage(CREATE_FAILED_MESSAGE);
      return;
    }
    if (memoResult.status === "invalid") {
      setMessage(
        memoResult.reason === "too_long"
          ? MEMO_TOO_LONG_MESSAGE
          : CREATE_FAILED_MESSAGE
      );
      return;
    }
    setMessage(null);
    setConfirmation({ title, memo });
  }

  async function create() {
    if (pending || !confirmation) return;
    const payload = confirmation;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.status === 429) {
        setMessage(RATE_LIMITED_MESSAGE);
        return;
      }
      const result: unknown = await response.json();
      if (!isCreateEventRouteResult(result)) {
        setMessage(OUTCOME_UNKNOWN_MESSAGE);
        return;
      }
      if (result.status === "created") {
        window.location.assign(result.path);
        return;
      }
      if (result.status === "outcome_unknown") {
        setMessage(OUTCOME_UNKNOWN_MESSAGE);
        return;
      }
      if (result.status === "invalid" && result.field === "memo") {
        const current = normalizeMemo(payload.memo);
        setMessage(
          current.status === "invalid" &&
            current.reason === "too_long"
            ? MEMO_TOO_LONG_MESSAGE
            : CREATE_FAILED_MESSAGE
        );
        return;
      }
      setMessage(CREATE_FAILED_MESSAGE);
    } catch {
      setMessage(OUTCOME_UNKNOWN_MESSAGE);
    } finally {
      setPending(false);
      setConfirmation(null);
    }
  }

  return (
    <>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          prepareCreation();
        }}
      >
        <label className="field">
          <span>きめること</span>
          <div className="wrapping-placeholder-input">
            <input
              name="title"
              type="text"
              required
              maxLength={80}
              placeholder={EVENT_TITLE_PLACEHOLDER}
              disabled={formDisabled}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <span aria-hidden="true">{EVENT_TITLE_PLACEHOLDER}</span>
          </div>
        </label>

        <label className="field">
          <span>つたえたいこと</span>
          <textarea
            name="memo"
            rows={4}
            placeholder="決めたい理由や、大切にしたいこと、予算、日程、避けたいことなど"
            disabled={formDisabled}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
          <span className="field-counter">
            {memoLength} / {MEMO_MAX_LENGTH}
          </span>
        </label>

        {message ? (
          <p className="form-message error" role="alert">
            {message}
          </p>
        ) : null}

        <button className="primary-button" type="submit" disabled={formDisabled}>
          {pending ? "作ってます" : "きめよう！"}
        </button>
      </form>

      {confirmation ? (
        <section
          aria-modal="true"
          className="confirm-dialog"
          role="dialog"
        >
          <p>この内容で作成してもよろしいですか？</p>
          <p>作成後に「きめること」は変更できません。</p>
          <div className="dialog-actions">
            <button
              className="primary-button"
              disabled={pending}
              type="button"
              onClick={() => void create()}
            >
              作成
            </button>
            <button
              className="text-button"
              disabled={pending}
              type="button"
              onClick={() => setConfirmation(null)}
            >
              キャンセル
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
