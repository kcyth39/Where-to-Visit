"use client";

import { useState } from "react";

import {
  createCandidateAction,
  deleteCandidateAction,
  updateCandidateFieldAction,
  updateCandidateProposerAction
} from "@/app/actions";
import { CandidateFeedback } from "@/components/CandidateFeedback";
import {
  type RunSlice5Mutation
} from "@/components/Slice5Mutation";
import { TwoStepDeleteDialog } from "@/components/TwoStepDeleteDialog";
import { CANDIDATE_TITLE_PLACEHOLDER } from "@/lib/constants";
import type {
  CandidateRecord,
  Slice5State
} from "@/lib/events";

type CandidateSectionProps = {
  eventId: string;
  shareToken: string;
  currentPath: string;
  candidates: CandidateRecord[];
  slice5: Slice5State;
  disabled: boolean;
  runMutation: RunSlice5Mutation;
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
  eventId,
  shareToken,
  currentPath,
  slice5,
  disabled,
  runMutation
}: {
  candidate: CandidateRecord;
  eventId: string;
  shareToken: string;
  currentPath: string;
  slice5: Slice5State;
  disabled: boolean;
  runMutation: RunSlice5Mutation;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(candidate.title ?? "");
  const [url, setUrl] = useState(candidate.url ?? "");
  const [createdBy, setCreatedBy] = useState(candidate.created_by ?? "");
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const participants = slice5.participants;
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
        <button
          className="text-button"
          disabled={disabled}
          type="button"
          onClick={() => setIsEditing((value) => !value)}
        >
          {isEditing ? "閉じる" : "編集"}
        </button>
      </div>

      {isEditing ? (
        <div className="candidate-edit-grid">
          <label className="field">
            <span>タイトル</span>
            <input disabled={disabled} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <button
            className="text-button"
            disabled={disabled}
            type="button"
            onClick={() => setChangeRequest({ kind: "title", candidateId: candidate.id, value: title })}
          >
            タイトルを変更
          </button>

          <label className="field">
            <span>リンク</span>
            <input disabled={disabled} value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>
          <button
            className="text-button"
            disabled={disabled}
            type="button"
            onClick={() => setChangeRequest({ kind: "url", candidateId: candidate.id, value: url })}
          >
            リンクを変更
          </button>

          <label className="field">
            <span>提案者</span>
            <select disabled={disabled} value={createdBy} onChange={(event) => setCreatedBy(event.target.value)}>
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
            disabled={disabled}
            type="button"
            onClick={() =>
              setChangeRequest({ kind: "proposer", candidateId: candidate.id, value: createdBy })
            }
          >
            提案者を変更
          </button>
        </div>
      ) : null}

      <CandidateFeedback
        candidateId={candidate.id}
        comments={slice5.comments}
        concerns={slice5.concerns}
        criteria={slice5.criteria}
        currentParticipantId={slice5.currentParticipantId}
        disabled={disabled}
        eventId={eventId}
        participants={slice5.participants}
        reactions={slice5.reactions}
        runMutation={runMutation}
        shareToken={shareToken}
      />

      <TwoStepDeleteDialog
        disabled={disabled}
        firstMessage="この候補を消しますか？"
        triggerLabel="削除"
        onConfirm={async () => {
          const formData = new FormData();
          formData.set("candidateId", candidate.id);
          formData.set("currentPath", currentPath);
          formData.set("eventId", eventId);
          formData.set("returnTo", currentPath);
          formData.set("shareToken", shareToken);
          await deleteCandidateAction(formData);
        }}
      />

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
            <button className="primary-button" disabled={disabled} type="submit">変更</button>
            <button className="text-button" disabled={disabled} type="button" onClick={() => setChangeRequest(null)}>
              キャンセル
            </button>
          </form>
        </section>
      ) : null}

    </article>
  );
}

export function CandidateSection({
  eventId,
  shareToken,
  currentPath,
  candidates,
  slice5,
  disabled,
  runMutation
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
              slice5={slice5}
              disabled={disabled}
              runMutation={runMutation}
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
          <input disabled={disabled} maxLength={160} name="title" placeholder={CANDIDATE_TITLE_PLACEHOLDER} />
        </label>
        <label className="field">
          <span>リンク</span>
          <input disabled={disabled} maxLength={2000} name="url" placeholder="リンク" type="url" />
        </label>
        <label className="field">
          <span>お名前（任意）</span>
          <input disabled={disabled} maxLength={60} name="displayName" placeholder="きめの すけざえもん" />
        </label>
        <button className="primary-button" disabled={disabled} type="submit">追加</button>
      </form>
    </section>
  );
}
