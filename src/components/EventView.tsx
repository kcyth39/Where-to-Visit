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
  const shareUrl = `${origin}/e/${view.event.share_token}`;
  const ownerUrl = `${origin}/o/${ownerToken ?? view.event.owner_token}`;

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
          </div>

          <div className="url-list" aria-label="発行URL">
            <div className="url-row">
              <div>
                <span>共有URL</span>
                <code>{shareUrl}</code>
              </div>
              <CopyButton value={shareUrl} />
            </div>
            {view.isOwner ? (
              <div className="url-row">
                <div>
                  <span>オーナー編集URL</span>
                  <code>{ownerUrl}</code>
                </div>
                <CopyButton value={ownerUrl} />
              </div>
            ) : null}
          </div>
        </div>

        {view.isOwner ? (
          <aside className="owner-panel" aria-label="オーナーメニュー">
            <h2>オーナーメニュー</h2>
            <form className="form-stack" action={updateEventAction}>
              <input type="hidden" name="eventId" value={view.event.id} />
              <input type="hidden" name="ownerToken" value={ownerToken ?? ""} />
              <input type="hidden" name="returnTo" value={currentPath} />
              <label className="field">
                <span>イベント名</span>
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
                保存
              </button>
            </form>
          </aside>
        ) : null}
      </section>
    </main>
  );
}
