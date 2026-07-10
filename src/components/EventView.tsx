"use client";

import { useEffect, useRef, useState } from "react";

import { refreshSlice5StateAction, updateEventAction } from "@/app/actions";
import { CandidateSection } from "@/components/CandidateSection";
import { CopyButton } from "@/components/CopyButton";
import { CriteriaSection } from "@/components/CriteriaSection";
import {
  createSlice5FormData,
  type RunSlice5Mutation,
  type Slice5Mutation
} from "@/components/Slice5Mutation";
import type { EventViewModel } from "@/lib/events";

type EventViewProps = {
  view: EventViewModel;
  origin: string;
  currentPath: string;
  ownerToken?: string;
  notice?: string | null;
  error?: string | null;
};

export function EventView({
  view,
  origin,
  currentPath,
  ownerToken,
  notice,
  error
}: EventViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(view.event.title);
  const [draftMemo, setDraftMemo] = useState(view.event.memo ?? "");
  const [confirmEventUpdate, setConfirmEventUpdate] = useState(false);
  const [slice5State, setSlice5State] = useState(view.slice5);
  const [slice5Error, setSlice5Error] = useState<string | null>(null);
  const [isSlice5Pending, setIsSlice5Pending] = useState(false);
  const [sharedActionsReady, setSharedActionsReady] = useState(!ownerToken);
  const slice5MutationInFlight = useRef(false);
  const shareUrl = `${origin}/e/${view.event.share_token}`;
  const ownerUrl = ownerToken ? `${origin}/o/${ownerToken}` : null;
  const sharedActionsDisabled = isSlice5Pending || !sharedActionsReady;

  useEffect(() => {
    if (!ownerToken) {
      setSharedActionsReady(true);
      return;
    }

    let active = true;
    setSharedActionsReady(false);

    async function recoverOwnerSession() {
      try {
        const response = await fetch(`/api/owner-session/${ownerToken}`, {
          method: "POST"
        });
        if (!response.ok) throw new Error("owner session recovery failed");

        const result = await refreshSlice5StateAction(
          createSlice5FormData(view.event.id, view.event.share_token)
        );
        if (!active) return;
        if (!result.data) {
          setSlice5Error(result.error);
          return;
        }

        setSlice5State(result.data);
        setSlice5Error(null);
        setSharedActionsReady(true);
      } catch {
        if (!active) return;
        setSlice5Error("オーナー情報を確認できませんでした。ページを再読み込みしてください。");
      }
    }

    void recoverOwnerSession();
    return () => {
      active = false;
    };
  }, [ownerToken, view.event.id, view.event.share_token]);

  const runSlice5Mutation: RunSlice5Mutation = async (
    mutation: Slice5Mutation
  ) => {
    if (sharedActionsDisabled || slice5MutationInFlight.current) return false;
    slice5MutationInFlight.current = true;
    setIsSlice5Pending(true);
    try {
      const result = await mutation();
      if (!result.data) {
        setSlice5Error(result.error);
        return false;
      }
      setSlice5State(result.data);
      setSlice5Error(null);
      return true;
    } catch {
      setSlice5Error("操作を完了できませんでした。もう一度お試しください。");
      return false;
    } finally {
      slice5MutationInFlight.current = false;
      setIsSlice5Pending(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="topbar" aria-label="サービス名">
        <a className="brand" href="/">
          きめのすけ
        </a>
      </section>

      <section className="event-layout">
        <div className="event-main">
          {notice ? (
            <p className="form-message success" role="status">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p className="form-message error" role="alert">
              {error}
            </p>
          ) : null}
          {slice5Error ? (
            <p className="form-message error" role="alert">
              {slice5Error}
            </p>
          ) : null}

          <div className="event-heading">
            <h1>{view.event.title}</h1>
            {view.event.memo ? <p>{view.event.memo}</p> : null}
            {view.isOwner ? (
              <div className="owner-affordance">
                <span>あなたは お題とメモを直せます</span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setIsEditing((current) => !current)}
                >
                  {isEditing ? "閉じる" : "直す"}
                </button>
              </div>
            ) : null}
          </div>

          {view.isOwner && isEditing ? (
            <form
              className="form-stack inline-edit-form"
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmEventUpdate(true);
              }}
            >
              <label className="field">
                <span>お題</span>
                <input
                  name="title"
                  type="text"
                  required
                  maxLength={80}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  value={draftTitle}
                />
              </label>
              <label className="field">
                <span>メモ</span>
                <textarea
                  name="memo"
                  rows={5}
                  maxLength={1000}
                  onChange={(event) => setDraftMemo(event.target.value)}
                  value={draftMemo}
                />
              </label>
              <button className="primary-button" type="submit">
                保存
              </button>
            </form>
          ) : null}

          {confirmEventUpdate ? (
            <section aria-modal="true" className="confirm-dialog" role="dialog">
              <p>変更します、よろしいですか？</p>
              <form action={updateEventAction}>
                <input type="hidden" name="eventId" value={view.event.id} />
                <input type="hidden" name="ownerToken" value={ownerToken ?? ""} />
                <input type="hidden" name="returnTo" value={currentPath} />
                <input type="hidden" name="title" value={draftTitle} />
                <input type="hidden" name="memo" value={draftMemo} />
                <button className="primary-button" type="submit">変更</button>
                <button className="text-button" type="button" onClick={() => setConfirmEventUpdate(false)}>
                  キャンセル
                </button>
              </form>
            </section>
          ) : null}

          <div className="url-list" aria-label="発行URL">
            <div className="url-row">
              <div>
                <span>みんなに送るリンク</span>
                <code>{shareUrl}</code>
              </div>
              <CopyButton value={shareUrl} />
            </div>
            {view.isOwner && ownerUrl ? (
              <div className="url-row">
                <div>
                  <span>あなた専用リンク</span>
                  <code>{ownerUrl}</code>
                </div>
                <CopyButton value={ownerUrl} />
              </div>
            ) : null}
          </div>

          <CriteriaSection
            criteria={slice5State.criteria}
            disabled={sharedActionsDisabled}
            eventId={view.event.id}
            runMutation={runSlice5Mutation}
            shareToken={view.event.share_token}
          />

          <CandidateSection
            candidates={view.candidates}
            currentPath={currentPath}
            disabled={sharedActionsDisabled}
            eventId={view.event.id}
            runMutation={runSlice5Mutation}
            shareToken={view.event.share_token}
            slice5={slice5State}
          />
        </div>
      </section>
    </main>
  );
}
