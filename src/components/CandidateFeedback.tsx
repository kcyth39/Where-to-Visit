"use client";

import { useState } from "react";

import {
  createCommentAction,
  deleteCommentAction,
  removeConcernAction,
  removeReactionAction,
  toggleConcernAction,
  toggleReactionAction,
  updateCommentAction
} from "@/app/actions";
import {
  createSlice5FormData,
  type RunSlice5Mutation
} from "@/components/Slice5Mutation";
import type {
  CommentRecord,
  ConcernRecord,
  CriterionRecord,
  ParticipantRecord,
  ReactionRecord
} from "@/lib/events";

type CandidateFeedbackProps = {
  candidateId: string;
  eventId: string;
  shareToken: string;
  criteria: CriterionRecord[];
  reactions: ReactionRecord[];
  concerns: ConcernRecord[];
  comments: CommentRecord[];
  participants: ParticipantRecord[];
  currentParticipantId: string | null;
  disabled: boolean;
  runMutation: RunSlice5Mutation;
};

function participantName(
  participants: ParticipantRecord[],
  participantId: string | null
): string {
  return (
    participants.find((participant) => participant.id === participantId)
      ?.display_name || "ー"
  );
}

function ParticipantList({
  rows,
  participants,
  currentParticipantId,
  disabled,
  onRemove
}: {
  rows: Array<{ id: string; participant_id: string }>;
  participants: ParticipantRecord[];
  currentParticipantId: string | null;
  disabled: boolean;
  onRemove: (rowId: string) => Promise<void>;
}) {
  return (
    <ul className="feedback-people-list">
      {rows.map((row) => (
        <li key={row.id}>
          <span>{participantName(participants, row.participant_id)}</span>
          {row.participant_id !== currentParticipantId ? (
            <button
              className="text-button"
              disabled={disabled}
              type="button"
              onClick={() => void onRemove(row.id)}
            >
              外す
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CommentItem({
  comment,
  eventId,
  shareToken,
  participants,
  disabled,
  runMutation
}: {
  comment: CommentRecord;
  eventId: string;
  shareToken: string;
  participants: ParticipantRecord[];
  disabled: boolean;
  runMutation: RunSlice5Mutation;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [isDeleting, setIsDeleting] = useState(false);

  async function saveComment() {
    const succeeded = await runMutation(() =>
      updateCommentAction(
        createSlice5FormData(eventId, shareToken, {
          commentId: comment.id,
          text: draft
        })
      )
    );
    if (succeeded) setIsEditing(false);
  }

  async function deleteComment() {
    const succeeded = await runMutation(() =>
      deleteCommentAction(
        createSlice5FormData(eventId, shareToken, { commentId: comment.id })
      )
    );
    if (succeeded) setIsDeleting(false);
  }

  return (
    <li className="comment-item">
      <div className="comment-meta">
        <strong>{participantName(participants, comment.participant_id)}</strong>
        <div className="compact-actions">
          <button
            className="text-button"
            disabled={disabled}
            type="button"
            onClick={() => {
              setDraft(comment.text);
              setIsEditing(true);
            }}
          >
            直す
          </button>
          <button
            className="danger-button"
            disabled={disabled}
            type="button"
            onClick={() => setIsDeleting(true)}
          >
            消す
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="comment-edit-form">
          <label className="field">
            <span className="sr-only">コメント</span>
            <textarea
              aria-label="コメントを編集"
              disabled={disabled}
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <div className="compact-actions">
            <button
              className="primary-button"
              disabled={disabled}
              type="button"
              onClick={() => void saveComment()}
            >
              保存
            </button>
            <button
              className="text-button"
              disabled={disabled}
              type="button"
              onClick={() => {
                setDraft(comment.text);
                setIsEditing(false);
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <p>{comment.text}</p>
      )}

      {isDeleting ? (
        <section aria-modal="true" className="confirm-dialog" role="dialog">
          <p>このコメントを削除しますか？</p>
          <div className="dialog-actions">
            <button
              className="danger-button"
              disabled={disabled}
              type="button"
              onClick={() => void deleteComment()}
            >
              消す
            </button>
            <button
              className="text-button"
              disabled={disabled}
              type="button"
              onClick={() => setIsDeleting(false)}
            >
              キャンセル
            </button>
          </div>
        </section>
      ) : null}
    </li>
  );
}

export function CandidateFeedback({
  candidateId,
  eventId,
  shareToken,
  criteria,
  reactions,
  concerns,
  comments,
  participants,
  currentParticipantId,
  disabled,
  runMutation
}: CandidateFeedbackProps) {
  const [openList, setOpenList] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const candidateConcerns = concerns.filter(
    (concern) => concern.candidate_id === candidateId
  );
  const ownConcern = candidateConcerns.some(
    (concern) => concern.participant_id === currentParticipantId
  );

  async function submitComment() {
    const succeeded = await runMutation(() =>
      createCommentAction(
        createSlice5FormData(eventId, shareToken, {
          candidateId,
          text: commentText
        })
      )
    );
    if (succeeded) setCommentText("");
  }

  return (
    <section className="candidate-feedback" aria-label="候補への反応とコメント">
      <div className="feedback-list">
        {criteria.map((criterion) => {
          const rows = reactions.filter(
            (reaction) =>
              reaction.candidate_id === candidateId &&
              reaction.criterion_id === criterion.id
          );
          const isOwn = rows.some(
            (reaction) => reaction.participant_id === currentParticipantId
          );
          const listKey = `reaction-${criterion.id}`;

          return (
            <div className="feedback-unit" key={criterion.id}>
              <div className={isOwn ? "feedback-chip heart-active" : "feedback-chip"}>
                <button
                  aria-pressed={isOwn}
                  className="feedback-toggle"
                  disabled={disabled}
                  type="button"
                  onClick={() =>
                    void runMutation(() =>
                      toggleReactionAction(
                        createSlice5FormData(eventId, shareToken, {
                          candidateId,
                          criterionId: criterion.id
                        })
                      )
                    )
                  }
                >
                  {criterion.label} ❤️
                </button>
                <button
                  aria-expanded={openList === listKey}
                  aria-label={`${criterion.label}を付けた人を見る`}
                  className="feedback-count"
                  disabled={rows.length === 0}
                  type="button"
                  onClick={() =>
                    setOpenList((value) => (value === listKey ? null : listKey))
                  }
                >
                  {rows.length}人
                </button>
              </div>
              {openList === listKey ? (
                <ParticipantList
                  currentParticipantId={currentParticipantId}
                  disabled={disabled}
                  participants={participants}
                  rows={rows}
                  onRemove={async (reactionId) => {
                    await runMutation(() =>
                      removeReactionAction(
                        createSlice5FormData(eventId, shareToken, { reactionId })
                      )
                    );
                  }}
                />
              ) : null}
            </div>
          );
        })}

        <div className="feedback-unit">
          <div className={ownConcern ? "feedback-chip concern-active" : "feedback-chip"}>
            <button
              aria-pressed={ownConcern}
              className="feedback-toggle"
              disabled={disabled}
              type="button"
              onClick={() =>
                void runMutation(() =>
                  toggleConcernAction(
                    createSlice5FormData(eventId, shareToken, { candidateId })
                  )
                )
              }
            >
              🌀 気になる
            </button>
            <button
              aria-expanded={openList === "concern"}
              aria-label="気になるを付けた人を見る"
              className="feedback-count"
              disabled={candidateConcerns.length === 0}
              type="button"
              onClick={() =>
                setOpenList((value) => (value === "concern" ? null : "concern"))
              }
            >
              {candidateConcerns.length}人
            </button>
          </div>
          {openList === "concern" ? (
            <ParticipantList
              currentParticipantId={currentParticipantId}
              disabled={disabled}
              participants={participants}
              rows={candidateConcerns}
              onRemove={async (concernId) => {
                await runMutation(() =>
                  removeConcernAction(
                    createSlice5FormData(eventId, shareToken, { concernId })
                  )
                );
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="comments-section">
        <h3>コメント</h3>
        <ul className="comment-list">
          {comments
            .filter((comment) => comment.candidate_id === candidateId)
            .map((comment) => (
              <CommentItem
                comment={comment}
                disabled={disabled}
                eventId={eventId}
                key={comment.id}
                participants={participants}
                runMutation={runMutation}
                shareToken={shareToken}
              />
            ))}
        </ul>
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submitComment();
          }}
        >
          <label className="field">
            <span className="sr-only">コメント</span>
            <textarea
              aria-describedby={`comment-limit-${candidateId}`}
              aria-label="コメント"
              disabled={disabled}
              placeholder="気になることや感想など（任意）"
              rows={3}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
            />
          </label>
          <div className="comment-submit-row">
            <span id={`comment-limit-${candidateId}`}>500文字まで</span>
            <button className="primary-button" disabled={disabled} type="submit">
              投稿
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
