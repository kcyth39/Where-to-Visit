"use client";

import { useState } from "react";

import {
  createCandidateAction,
  deleteCandidateAction,
  updateCandidateFieldAction,
  updateCandidateProposerAction
} from "@/app/actions";
import { CANDIDATE_TITLE_PLACEHOLDERS, type EventAttribute } from "@/lib/constants";
import type { CandidateRecord, ParticipantRecord } from "@/lib/events";

type CandidateSectionProps = {
  eventId: string;
  attribute: EventAttribute;
  shareToken: string;
  currentPath: string;
  candidates: CandidateRecord[];
  participants: ParticipantRecord[];
};

type ChangeRequest = {
  kind: "title" | "url" | "proposer";
  candidateId: string;
  value: string;
};

function HiddenCandidateContext({
  eventId,
  shareToken,
  currentPath,
  candidateId
}: {
  eventId: string;
  shareToken: string;
  currentPath: string;
  candidateId?: string;
}) {
  return (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="shareToken" value={shareToken} />
      <input type="hidden" name="returnTo" value={currentPath} />
      {candidateId ? <input type="hidden" name="candidateId" value={candidateId} /> : null}
    </>
  );
}

function CandidateItem({
  candidate,
  participants,
  eventId,
  shareToken,
  currentPath
}: {
  candidate: CandidateRecord;
  participants: ParticipantRecord[];
  eventId: string;
  shareToken: string;
  currentPath: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(candidate.title ?? "");
  const [url, setUrl] = useState(candidate.url ?? "");
  const [createdBy, setCreatedBy] = useState(candidate.created_by ?? "");
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const proposer = participants.find((participant) => participant.id === candidate.created_by);
  const changeAction =
    changeRequest?.kind === "proposer"
      ? updateCandidateProposerAction
      : updateCandidateFieldAction;

  return (
    <article className="candidate-item">
      <div className="candidate-summary">
        <div>
          {candidate.title ? <strong>{candidate.title}</strong> : null}
          {candidate.url ? (
            <a href={candidate.url} rel="noreferrer" target="_blank">
              {candidate.title ? candidate.url : candidate.url}
            </a>
          ) : null}
          <p>提案: {proposer?.display_name || "ー"}</p>
        </div>
        <button className="text-button" type="button" onClick={() => setIsEditing((value) => !value)}>
          {isEditing ? "閉じる" : "編集"}
        </button>
      </div>

      {isEditing ? (
        <div className="candidate-edit-grid">
          <label className="field">
            <span>タイトル</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <button
            className="text-button"
            type="button"
            onClick={() => setChangeRequest({ kind: "title", candidateId: candidate.id, value: title })}
          >
            タイトルを変更
          </button>

          <label className="field">
            <span>リンク</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>
          <button
            className="text-button"
            type="button"
            onClick={() => setChangeRequest({ kind: "url", candidateId: candidate.id, value: url })}
          >
            リンクを変更
          </button>

          <label className="field">
            <span>提案者</span>
            <select value={createdBy} onChange={(event) => setCreatedBy(event.target.value)}>
              <option value="">ー</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.display_name || "ー"}
                </option>
              ))}
            </select>
          </label>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setChangeRequest({ kind: "proposer", candidateId: candidate.id, value: createdBy })
            }
          >
            提案者を変更
          </button>
        </div>
      ) : null}

      <button className="danger-button" type="button" onClick={() => setDeleteStep(1)}>
        削除
      </button>

      {changeRequest ? (
        <section aria-modal="true" className="confirm-dialog" role="dialog">
          <p>変更します、よろしいですか？</p>
          <form action={changeAction}>
            <HiddenCandidateContext
              candidateId={changeRequest.candidateId}
              currentPath={currentPath}
              eventId={eventId}
              shareToken={shareToken}
            />
            {changeRequest.kind === "proposer" ? (
              <input name="createdBy" type="hidden" value={changeRequest.value} />
            ) : (
              <>
                <input name="field" type="hidden" value={changeRequest.kind} />
                <input name="value" type="hidden" value={changeRequest.value} />
              </>
            )}
            <button className="primary-button" type="submit">変更</button>
            <button className="text-button" type="button" onClick={() => setChangeRequest(null)}>
              キャンセル
            </button>
          </form>
        </section>
      ) : null}

      {deleteStep ? (
        <section
          aria-modal="true"
          className={deleteStep === 2 ? "confirm-dialog danger-dialog" : "confirm-dialog"}
          role="dialog"
        >
          <p>{deleteStep === 1 ? "この候補を消しますか？" : "本当によろしいですか？"}</p>
          {deleteStep === 1 ? (
            <>
              <button className="danger-button" type="button" onClick={() => setDeleteStep(2)}>
                消す
              </button>
              <button className="text-button" type="button" onClick={() => setDeleteStep(0)}>
                キャンセル
              </button>
            </>
          ) : (
            <form action={deleteCandidateAction}>
              <HiddenCandidateContext
                candidateId={candidate.id}
                currentPath={currentPath}
                eventId={eventId}
                shareToken={shareToken}
              />
              <button className="danger-button" type="submit">消す</button>
              <button className="text-button" type="button" onClick={() => setDeleteStep(0)}>
                キャンセル
              </button>
            </form>
          )}
        </section>
      ) : null}
    </article>
  );
}

export function CandidateSection({
  eventId,
  attribute,
  shareToken,
  currentPath,
  candidates,
  participants
}: CandidateSectionProps) {
  return (
    <section className="candidate-section" aria-labelledby="candidates-heading">
      <div className="section-heading">
        <h2 id="candidates-heading">候補</h2>
        <p>タイトルかリンクのどちらかでOK。候補はいつでも追加できます</p>
      </div>

      <div className="candidate-list">
        {candidates.length ? (
          candidates.map((candidate) => (
            <CandidateItem
              candidate={candidate}
              currentPath={currentPath}
              eventId={eventId}
              key={candidate.id}
              participants={participants}
              shareToken={shareToken}
            />
          ))
        ) : (
          <p className="empty-state">まだ候補はありません</p>
        )}
      </div>

      <form action={createCandidateAction} className="form-stack candidate-form">
        <HiddenCandidateContext
          currentPath={currentPath}
          eventId={eventId}
          shareToken={shareToken}
        />
        <h2>候補を追加</h2>
        <label className="field">
          <span>タイトル</span>
          <input maxLength={160} name="title" placeholder={CANDIDATE_TITLE_PLACEHOLDERS[attribute]} />
        </label>
        <label className="field">
          <span>リンク</span>
          <input maxLength={2000} name="url" placeholder="リンク" type="url" />
        </label>
        <label className="field">
          <span>お名前（任意）</span>
          <input maxLength={60} name="displayName" placeholder="きめの すけざえもん" />
        </label>
        <button className="primary-button" type="submit">追加</button>
      </form>
    </section>
  );
}
