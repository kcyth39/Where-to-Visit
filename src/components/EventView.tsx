"use client";

import { useState } from "react";

import { updateEventAction } from "@/app/actions";
import { CopyButton } from "@/components/CopyButton";
import { EVENT_ATTRIBUTE_LABELS } from "@/lib/constants";
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
  const shareUrl = `${origin}/e/${view.event.share_token}`;
  const ownerUrl = ownerToken ? `${origin}/o/${ownerToken}` : null;

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

          <div className="event-heading">
            <p className="eyebrow">
              {EVENT_ATTRIBUTE_LABELS[view.event.attribute]}
            </p>
            <h1>{view.event.title}</h1>
            {view.event.memo ? <p>{view.event.memo}</p> : null}
            {view.isOwner ? (
              <div className="owner-affordance">
                <span>あなたは お題とメモをなおせます</span>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setIsEditing((current) => !current)}
                >
                  {isEditing ? "とじる" : "なおす"}
                </button>
              </div>
            ) : null}
          </div>

          {view.isOwner && isEditing ? (
            <form className="form-stack inline-edit-form" action={updateEventAction}>
              <input type="hidden" name="eventId" value={view.event.id} />
              <input type="hidden" name="ownerToken" value={ownerToken ?? ""} />
              <input type="hidden" name="returnTo" value={currentPath} />
              <label className="field">
                <span>お題</span>
                <input
                  name="title"
                  type="text"
                  required
                  maxLength={80}
                  defaultValue={view.event.title}
                />
              </label>
              <label className="field">
                <span>メモ</span>
                <textarea
                  name="memo"
                  rows={5}
                  maxLength={1000}
                  defaultValue={view.event.memo ?? ""}
                />
              </label>
              <button className="primary-button" type="submit">
                ほぞん
              </button>
            </form>
          ) : null}

          <div className="url-list" aria-label="発行URL">
            <div className="url-row">
              <div>
                <span>みんなにおくるリンク</span>
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
        </div>
      </section>
    </main>
  );
}
