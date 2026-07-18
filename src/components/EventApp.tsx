"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createCandidateAction,
  createCriterionAction,
  deleteCandidateAction,
  deleteCriterionAction,
  deleteParticipantAction,
  renameParticipantAction,
  resolveParticipantAction,
  saveCommentAction,
  setConcernAction,
  setReactionAction,
  setVoteAction,
  updateCandidateAction,
  updateCriterionAction,
  updateEventAction
} from "@/app/actions";
import { BrandHeader } from "@/components/BrandHeader";
import { CopyButton } from "@/components/CopyButton";
import { RespondentSelector } from "@/components/RespondentSelector";
import { TwoStepDeleteDialog } from "@/components/TwoStepDeleteDialog";
import {
  candidateUrlErrorMessage,
  normalizeCandidateUrl
} from "@/lib/candidate-url";
import { CRITERION_PRESETS } from "@/lib/constants";
import type {
  CandidateSummary,
  CriterionRecord,
  EventState,
  MutationResult,
  ParticipantRecord,
  VoteValue
} from "@/lib/events";

type EventAppProps = {
  initialState: EventState;
  isOwner: boolean;
  origin: string;
  ownerToken?: string;
  initialSetup?: boolean;
  candidateId?: string;
};

type PendingRequest = {
  run: (participantId: string) => Promise<boolean>;
  complete: (succeeded: boolean) => void;
};

type EventViewMode =
  | "loading"
  | "guest-selection"
  | "owner-setup"
  | "candidate-detail"
  | "dashboard";

const decisionLabels = {
  clear: "有力候補、最多の○かつ×なし",
  discussion: "要相談候補、最多の○かつ×あり",
  fallback: "代替候補、×なしの有力候補",
  none: "通常候補"
} as const;

const evaluationLabels = {
  unrated: "未評価",
  positive: "○",
  neutral: "−",
  veto: "×"
} as const;

const dashboardEvaluationIcons = {
  positive: "⭕️",
  neutral: "ー",
  veto: "❌"
} as const;

function EventTopbar({
  shareToken,
  viewMode
}: {
  shareToken: string;
  viewMode: EventViewMode;
}) {
  const isCandidateDetail = viewMode === "candidate-detail";
  const isDashboard = viewMode === "dashboard";
  const label = isCandidateDetail ? "一覧に戻る" : "候補一覧";
  const navigation = isDashboard ? null : (
    <a className="event-nav-link" href={`/e/${shareToken}`}>
      {label}
    </a>
  );

  return <BrandHeader navigation={navigation} />;
}

function CandidateVoteControls({
  candidate,
  selectedParticipantId,
  disabled,
  onVote
}: {
  candidate: CandidateSummary;
  selectedParticipantId: string | null;
  disabled: boolean;
  onVote: (candidateId: string, value: VoteValue) => Promise<boolean>;
}) {
  const label = candidate.candidate.title || "リンク候補";
  const selectedRow = candidate.respondents.find(
    (row) => row.participant.id === selectedParticipantId
  );
  const voteCounts = {
    positive: candidate.positiveCount,
    neutral: candidate.neutralCount,
    veto: candidate.vetoCount
  } as const;

  return (
    <div className="dashboard-summary-vote-controls" aria-label="あなたの総合評価">
      {(["positive", "neutral", "veto"] as const).map((value) => {
        const active = selectedRow?.evaluation === value;
        return (
          <button
            aria-label={`${label}を${evaluationLabels[value]}に評価`}
            aria-pressed={active}
            className={`dashboard-summary-vote-button ${value}`}
            disabled={disabled}
            key={value}
            type="button"
            onClick={() => {
              if (!active) void onVote(candidate.candidate.id, value);
            }}
          >
            <span aria-hidden="true">{dashboardEvaluationIcons[value]}</span>
            <span>{voteCounts[value]}</span>
          </button>
        );
      })}
    </div>
  );
}

function CriterionFeedbackDialog({
  candidate,
  criteria,
  selectedParticipantId,
  disabled,
  dialogId,
  onReaction,
  onConcern,
  onEditCriteria,
  onClose
}: {
  candidate: CandidateSummary;
  criteria: CriterionRecord[];
  selectedParticipantId: string | null;
  disabled: boolean;
  dialogId: string;
  onReaction: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  onConcern: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  onEditCriteria: () => void;
  onClose: () => void;
}) {
  const label = candidate.candidate.title || "リンク候補";
  const selectedRow = candidate.respondents.find(
    (row) => row.participant.id === selectedParticipantId
  );

  return (
    <section
      aria-labelledby={`${dialogId}-title`}
      aria-modal="true"
      className="modal-backdrop"
      id={dialogId}
      role="dialog"
    >
      <div className="modal-panel dashboard-summary-criterion-picker">
        <div className="dashboard-summary-picker-heading">
          <h2 id={`${dialogId}-title`}>{label}</h2>
          <button
            aria-label="反応入力を閉じる"
            className="icon-menu-button"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="dashboard-summary-picker-list">
          {criteria.map((criterion) => {
            const heartActive = selectedRow?.reactionCriterionIds.includes(criterion.id) ?? false;
            const concernActive = selectedRow?.concernCriterionIds.includes(criterion.id) ?? false;
            const heartCount = candidate.respondents.filter((row) =>
              row.reactionCriterionIds.includes(criterion.id)
            ).length;
            const concernCount = candidate.respondents.filter((row) =>
              row.concernCriterionIds.includes(criterion.id)
            ).length;

            return (
              <div className="dashboard-summary-picker-row" key={criterion.id}>
                <span className="dashboard-summary-picker-label">{criterion.label}</span>
                <button
                  aria-label={`${criterion.label}にハート`}
                  aria-pressed={heartActive}
                  className="dashboard-summary-picker-option heart"
                  disabled={disabled}
                  type="button"
                  onClick={() => {
                    if (!selectedParticipantId) onClose();
                    void onReaction(candidate.candidate.id, criterion.id, !heartActive);
                  }}
                >
                  <span aria-hidden="true" className="dashboard-summary-picker-icon">❤️</span>
                  <span className="dashboard-action-count">{heartCount}</span>
                </button>
                <button
                  aria-label={`${criterion.label}に気になる`}
                  aria-pressed={concernActive}
                  className="dashboard-summary-picker-option concern"
                  disabled={disabled}
                  type="button"
                  onClick={() => {
                    if (!selectedParticipantId) onClose();
                    void onConcern(candidate.candidate.id, criterion.id, !concernActive);
                  }}
                >
                  <span aria-hidden="true" className="dashboard-summary-picker-icon">🌀</span>
                  <span className="dashboard-action-count">{concernCount}</span>
                </button>
              </div>
            );
          })}
        </div>
        <button
          className="text-button dashboard-summary-picker-add"
          disabled={disabled}
          type="button"
          onClick={onEditCriteria}
        >
          反応項目の追加
        </button>
      </div>
    </section>
  );
}

function DashboardSummaryTable({
  candidates,
  eventId,
  shareToken,
  criteria,
  selectedParticipantId,
  disabled,
  onVote,
  onReaction,
  onConcern,
  runMutation
}: {
  candidates: CandidateSummary[];
  eventId: string;
  shareToken: string;
  criteria: CriterionRecord[];
  selectedParticipantId: string | null;
  disabled: boolean;
  onVote: (candidateId: string, value: VoteValue) => Promise<boolean>;
  onReaction: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  onConcern: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
}) {
  const [criterionPickerCandidateId, setCriterionPickerCandidateId] = useState<string | null>(null);
  const [criterionEditorCandidateId, setCriterionEditorCandidateId] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  const pickerCandidate = criterionPickerCandidateId
    ? candidates.find((summary) => summary.candidate.id === criterionPickerCandidateId) ?? null
    : null;
  const editorCandidate = criterionEditorCandidateId
    ? candidates.find((summary) => summary.candidate.id === criterionEditorCandidateId) ?? null
    : null;

  return (
    <div className="dashboard-summary-table-wrapper">
      <table className="dashboard-summary-table">
        <caption className="sr-only">候補のまとめ</caption>
        <colgroup>
          <col className="dashboard-summary-name-column" />
          <col className="dashboard-summary-url-column" />
          <col className="dashboard-summary-evaluation-column" />
          <col className="dashboard-summary-heart-column" />
          <col className="dashboard-summary-concern-column" />
        </colgroup>
        <tbody>
          {candidates.map((summary) => {
            const label = summary.candidate.title || "リンク候補";
            const candidateHref = `/e/${shareToken}/c/${summary.candidate.id}`;
            return (
              <tr
                className={`dashboard-summary-row decision-${summary.decisionState}`}
                data-decision-state={summary.decisionState}
                key={summary.candidate.id}
              >
                <th className="dashboard-summary-name" scope="row">
                  <a
                    aria-disabled={disabled || undefined}
                    href={disabled ? undefined : candidateHref}
                    tabIndex={disabled ? 0 : undefined}
                    onClick={(event) => {
                      if (disabled) event.preventDefault();
                    }}
                  >
                    {label}
                  </a>
                  <span className="sr-only">、{decisionLabels[summary.decisionState]}</span>
                </th>
                <td className="dashboard-summary-url">
                  {summary.candidate.url ? (
                    <a
                      className="dashboard-summary-url-link"
                      href={summary.candidate.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {summary.candidate.url}
                    </a>
                  ) : (
                    <span className="muted">URLなし</span>
                  )}
                </td>
                <td className="dashboard-summary-evaluation">
                  <CandidateVoteControls
                    candidate={summary}
                    disabled={disabled}
                    selectedParticipantId={selectedParticipantId}
                    onVote={onVote}
                  />
                </td>
                <td className="dashboard-summary-total">
                  <button
                    aria-label={`${label}のハート、合計${summary.heartCount}、判断基準を選ぶ`}
                    aria-controls="dashboard-summary-criterion-picker"
                    aria-expanded={criterionPickerCandidateId === summary.candidate.id}
                    aria-haspopup="dialog"
                    className="dashboard-summary-reaction-trigger heart"
                    disabled={disabled}
                    type="button"
                    onClick={() => setCriterionPickerCandidateId(summary.candidate.id)}
                  >
                    <span aria-hidden="true">❤️</span>
                    <span>{summary.heartCount}</span>
                  </button>
                </td>
                <td className="dashboard-summary-total">
                  <button
                    aria-label={`${label}の気になる、合計${summary.concernCount}、判断基準を選ぶ`}
                    aria-controls="dashboard-summary-criterion-picker"
                    aria-expanded={criterionPickerCandidateId === summary.candidate.id}
                    aria-haspopup="dialog"
                    className="dashboard-summary-reaction-trigger concern"
                    disabled={disabled}
                    type="button"
                    onClick={() => setCriterionPickerCandidateId(summary.candidate.id)}
                  >
                    <span aria-hidden="true">🌀</span>
                    <span>{summary.concernCount}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {criterionPickerCandidateId && pickerCandidate ? (
        <CriterionFeedbackDialog
          candidate={pickerCandidate}
          criteria={criteria}
          dialogId="dashboard-summary-criterion-picker"
          disabled={disabled}
          selectedParticipantId={selectedParticipantId}
          onClose={() => setCriterionPickerCandidateId(null)}
          onConcern={onConcern}
          onEditCriteria={() => {
            setCriterionPickerCandidateId(null);
            setCriterionEditorCandidateId(pickerCandidate.candidate.id);
          }}
          onReaction={onReaction}
        />
      ) : null}
      {criterionEditorCandidateId && editorCandidate ? (
        <CriteriaEditorDialog
          candidate={editorCandidate}
          criteria={criteria}
          dialogId="dashboard-criterion-editor"
          disabled={disabled}
          eventId={eventId}
          initialAdding
          onClose={() => setCriterionEditorCandidateId(null)}
          runMutation={runMutation}
          selectedParticipantId={selectedParticipantId}
          shareToken={shareToken}
        />
      ) : null}
    </div>
  );
}

function CandidateHeader({
  summary,
  shareToken,
  linked = true
}: {
  summary: CandidateSummary;
  shareToken: string;
  linked?: boolean;
}) {
  const label = summary.candidate.title || "リンク候補";
  const title = linked ? (
    <a className="candidate-title-link" href={`/e/${shareToken}/c/${summary.candidate.id}`}>
      {label}
    </a>
  ) : (
    <h1>{label}</h1>
  );

  return (
    <div className="candidate-card-content">
      <div className="candidate-title-row">{title}</div>
      {summary.candidate.url ? (
        <a className="candidate-url" href={summary.candidate.url} rel="noopener noreferrer" target="_blank">
          {summary.candidate.url}
        </a>
      ) : (
        <span className="candidate-url muted">URLなし</span>
      )}
      <p className="candidate-meta">
        {summary.relativeCreatedAt} ・ 提案者 {summary.proposerName ?? "ー"}
      </p>
    </div>
  );
}

function EventHeading({
  state,
  isOwner,
  disabled,
  onUpdate
}: {
  state: EventState;
  isOwner: boolean;
  disabled: boolean;
  onUpdate: (title: string, memo: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(state.event.title);
  const [memo, setMemo] = useState(state.event.memo ?? "");

  async function save() {
    if (await onUpdate(title, memo)) {
      setConfirming(false);
      setEditing(false);
    }
  }

  return (
    <section className="event-heading-block">
      <div className="event-title-line">
        <div>
          <h1>{state.event.title}</h1>
          {state.event.memo ? <p>{state.event.memo}</p> : null}
        </div>
        {isOwner ? (
          <button className="quiet-edit-button" disabled={disabled} type="button" onClick={() => setEditing(true)}>
            直す
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="inline-editor">
          <label className="field"><span>きめること</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field"><span>つたえておきたいこと（任意）</span><textarea rows={4} value={memo} onChange={(event) => setMemo(event.target.value)} /></label>
          <div className="compact-actions">
            <button className="primary-button" type="button" onClick={() => setConfirming(true)}>保存</button>
            <button className="text-button" type="button" onClick={() => setEditing(false)}>キャンセル</button>
          </div>
        </div>
      ) : null}

      {confirming ? (
        <section aria-modal="true" className="confirm-dialog" role="dialog">
          <p>変更します、よろしいですか？</p>
          <div className="dialog-actions">
            <button className="primary-button" disabled={disabled} type="button" onClick={() => void save()}>変更</button>
            <button className="text-button" type="button" onClick={() => setConfirming(false)}>キャンセル</button>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function CandidateAddForm({
  disabled,
  onIntentStart,
  onCreate
}: {
  disabled: boolean;
  onIntentStart?: () => void;
  onCreate: (title: string, url: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  return (
    <form
      className="candidate-add-form"
      noValidate
      onPointerDownCapture={onIntentStart}
      onSubmit={(event) => {
        event.preventDefault();
        const urlResult = normalizeCandidateUrl(url);
        if (urlResult.error) {
          setUrlError(candidateUrlErrorMessage(urlResult.error));
          return;
        }
        setUrlError(null);
        void onCreate(title, urlResult.value ?? "").then((ok) => {
          if (ok) {
            setTitle("");
            setUrl("");
          }
        });
      }}
    >
      <label className="field"><span>候補名</span><input aria-label="候補名" disabled={disabled} type="text" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="field"><span>リンク</span><input aria-describedby={urlError ? "candidate-add-url-error" : undefined} aria-invalid={urlError ? "true" : undefined} aria-label="リンク" disabled={disabled} type="url" value={url} onChange={(event) => { setUrl(event.target.value); setUrlError(null); }} /></label>
      {urlError ? <p className="form-message error" id="candidate-add-url-error" role="alert">{urlError}</p> : null}
      <button className="primary-button" disabled={disabled} type="submit">追加</button>
    </form>
  );
}

function ShareLinks({
  state,
  origin,
  ownerToken
}: {
  state: EventState;
  origin: string;
  ownerToken?: string;
}) {
  const shareUrl = `${origin}/e/${state.event.share_token}`;
  const ownerUrl = ownerToken ? `${origin}/o/${ownerToken}` : null;

  return (
    <section className="sharing-section" aria-labelledby="sharing-heading">
      <h2 id="sharing-heading">URLを送る</h2>
      <p className="sharing-description">
        みんなにリンクを送って、決めていきましょう。メールやLINEなど、なんでもいいよ。
        {ownerUrl ? "あなた専用リンクでは、きめることと、つたえておきたいことを編集できます。" : null}
      </p>
      <div className={`setup-links${ownerUrl ? "" : " single"}`}>
        <div className="setup-link share">
          <span>みんなに送るリンク</span>
          <code>{shareUrl}</code>
          <CopyButton emphasis value={shareUrl} />
        </div>
        {ownerUrl ? (
          <div className="setup-link owner">
            <span>あなた専用リンク</span>
            <code>{ownerUrl}</code>
            <CopyButton value={ownerUrl} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Dashboard({
  state,
  isOwner,
  origin,
  ownerToken,
  selectedParticipantId,
  disabled,
  onRequestName,
  onUpdateEvent,
  onCreateCandidate,
  onVote,
  onReaction,
  onConcern,
  runMutation
}: {
  state: EventState;
  isOwner: boolean;
  origin: string;
  ownerToken?: string;
  selectedParticipantId: string | null;
  disabled: boolean;
  onRequestName: () => void;
  onUpdateEvent: (title: string, memo: string) => Promise<boolean>;
  onCreateCandidate: (title: string, url: string) => Promise<boolean>;
  onVote: (candidateId: string, value: VoteValue) => Promise<boolean>;
  onReaction: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  onConcern: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
}) {
  const selected = state.participants.find(
    (participant) => participant.id === selectedParticipantId
  );

  return (
    <>
      <EventHeading state={state} isOwner={isOwner} disabled={disabled} onUpdate={onUpdateEvent} />
      <section className="dashboard-section" aria-labelledby="dashboard-identity-heading">
        <div className="dashboard-identity-bar">
          <h2 id="dashboard-identity-heading">
            {selected ? `${selected.display_name}として判断中` : "お名前を選んで判断"}
          </h2>
          <button className="quiet-edit-button" disabled={disabled} type="button" onClick={onRequestName}>
            {selected ? "変更" : "お名前を選ぶ"}
          </button>
        </div>
        <DashboardSummaryTable
          candidates={state.candidates}
          eventId={state.event.id}
          shareToken={state.event.share_token}
          criteria={state.criteria}
          selectedParticipantId={selectedParticipantId}
          disabled={disabled}
          onVote={onVote}
          onReaction={onReaction}
          onConcern={onConcern}
          runMutation={runMutation}
        />
        {state.candidates.length === 0 ? <p className="empty-state">候補はまだありません。</p> : null}
        <h2 className="candidate-add-heading">候補の追加</h2>
        <CandidateAddForm disabled={disabled} onCreate={onCreateCandidate} />
      </section>
      {isOwner ? <ShareLinks state={state} origin={origin} ownerToken={ownerToken} /> : null}
    </>
  );
}

function OwnerSetup({
  state,
  origin,
  ownerToken,
  isOwner,
  selectedParticipantId,
  disabled,
  draftName,
  selectorError,
  onDraftChange,
  onSelect,
  onCommit,
  onCandidateIntentStart,
  onUpdateEvent,
  onCreateCandidate
}: {
  state: EventState;
  origin: string;
  ownerToken: string;
  isOwner: boolean;
  selectedParticipantId: string | null;
  disabled: boolean;
  draftName: string;
  selectorError: string | null;
  onDraftChange: (value: string) => void;
  onSelect: (participant: ParticipantRecord) => void;
  onCommit: (reason: "enter" | "blur", nextTarget?: HTMLElement | null) => void;
  onCandidateIntentStart: () => void;
  onUpdateEvent: (title: string, memo: string) => Promise<boolean>;
  onCreateCandidate: (title: string, url: string) => Promise<boolean>;
}) {
  const ownerUrl = `${origin}/o/${ownerToken}`;
  const shareUrl = `${origin}/e/${state.event.share_token}`;
  const [sharingReady, setSharingReady] = useState(false);
  const canStart = Boolean(selectedParticipantId && state.candidates.length > 0 && !disabled);

  return (
    <>
      <EventHeading state={state} isOwner={isOwner} disabled={disabled} onUpdate={onUpdateEvent} />
      {sharingReady ? (
        <section className="setup-share-step" aria-labelledby="setup-share-heading">
          <div className="setup-link share setup-share-link">
            <h2 id="setup-share-heading">みんなに送るリンク</h2>
            <code>{shareUrl}</code>
            <CopyButton emphasis value={shareUrl} />
          </div>
          <a className="primary-button setup-opinion-link" href={ownerUrl}>
            わたしの意見を入力
          </a>
        </section>
      ) : (
        <>
          <p className="setup-intro">お名前と候補を入れたら、さあ、きめましょう！</p>
          <section className="setup-action">
            <h2><span>1.</span> お名前を入れる</h2>
            <p className="setup-field-help">ここで選んだ名前が、候補や回答の名義になります。</p>
            <RespondentSelector
              participants={state.participants}
              draft={draftName}
              error={selectorError}
              disabled={disabled}
              onDraftChange={onDraftChange}
              onSelect={onSelect}
              onCommit={(reason, nextTarget) => {
                if (reason === "blur" && nextTarget?.closest(".candidate-add-form")) return;
                onCommit(reason, nextTarget);
              }}
            />
          </section>
          <section className="setup-action">
            <h2><span>2.</span> 候補の追加</h2>
            <p className="setup-field-help">候補名だけでも、リンクだけでも追加できます。</p>
            <CandidateAddForm disabled={disabled} onIntentStart={onCandidateIntentStart} onCreate={onCreateCandidate} />
            {state.candidates.length > 0 ? (
              <div className="setup-added-candidates" aria-live="polite">
                <h3>追加した候補</h3>
                <ul>
                  {state.candidates.map(({ candidate }) => (
                    <li key={candidate.id}>
                      <span className="setup-added-status">追加済み</span>
                      <span className="setup-added-value">{candidate.title || candidate.url}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          <div className="setup-action setup-start">
            <button
              className="primary-button setup-start-button"
              disabled={!canStart}
              type="button"
              onClick={() => setSharingReady(true)}
            >
              さあ、きめよう！
            </button>
          </div>
        </>
      )}
    </>
  );
}

function CriteriaEditorDialog({
  eventId,
  shareToken,
  criteria,
  candidate,
  selectedParticipantId,
  disabled,
  dialogId,
  initialAdding = false,
  runMutation,
  onClose
}: {
  eventId: string;
  shareToken: string;
  criteria: CriterionRecord[];
  candidate: CandidateSummary;
  selectedParticipantId: string | null;
  disabled: boolean;
  dialogId: string;
  initialAdding?: boolean;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(initialAdding);
  const [customLabel, setCustomLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const existingLabels = new Set(criteria.map((criterion) => criterion.label.trim()));

  async function add(label: string, source: "preset" | "custom") {
    const ok = await runMutation(() =>
      createCriterionAction({
        eventId,
        shareToken,
        label,
        source,
        createdBy: selectedParticipantId
      })
    );
    if (ok) {
      setCustomLabel("");
      setAdding(false);
    }
  }

  return (
    <section
      aria-labelledby={`${dialogId}-title`}
      aria-modal="true"
      className="modal-backdrop"
      id={dialogId}
      role="dialog"
    >
      <div className="modal-panel detail-editor-dialog">
        <div className="detail-editor-dialog-heading">
          <h2 id={`${dialogId}-title`}>❤️／🌀反応項目の編集</h2>
          <button aria-label="反応項目の編集を閉じる" className="icon-menu-button" type="button" onClick={onClose}>×</button>
        </div>
        <ul className="criterion-overview-list">
          {criteria.map((criterion) => {
            const heartPeople = candidate.respondents.filter((row) => row.reactionCriterionIds.includes(criterion.id)).map((row) => row.participant.display_name);
            const concernPeople = candidate.respondents.filter((row) => row.concernCriterionIds.includes(criterion.id)).map((row) => row.participant.display_name);
            return (
              <li key={criterion.id}>
                <div className="criterion-overview"><strong>{criterion.label}</strong><span>❤️ {heartPeople.length}</span><span>🌀 {concernPeople.length}</span><small>{[...heartPeople, ...concernPeople].filter((name, index, rows) => rows.indexOf(name) === index).join("、") || "ー"}</small><button aria-label={`${criterion.label}の編集メニュー`} className="icon-menu-button" type="button" onClick={() => { setEditingId(editingId === criterion.id ? null : criterion.id); setEditLabel(criterion.label); }}>…</button></div>
                {editingId === criterion.id ? <div className="criterion-menu"><label className="field"><span>反応項目</span><input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} /></label><button className="text-button" disabled={disabled} type="button" onClick={() => void runMutation(() => updateCriterionAction({ eventId, shareToken, criterionId: criterion.id, label: editLabel })).then((ok) => { if (ok) setEditingId(null); })}>保存</button><TwoStepDeleteDialog disabled={disabled} firstMessage={`${criterion.label}を削除しますか？`} triggerLabel="削除" onConfirm={() => runMutation(() => deleteCriterionAction({ eventId, shareToken, criterionId: criterion.id }))} /></div> : null}
              </li>
            );
          })}
        </ul>
        <button className="text-button" disabled={disabled} type="button" onClick={() => setAdding((value) => !value)}>反応項目の追加</button>
        {adding ? (
          <div className="criteria-add-panel">
            <div className="criterion-presets">{CRITERION_PRESETS.filter((preset) => !existingLabels.has(preset)).map((preset) => <button className="preset-button" disabled={disabled} key={preset} type="button" onClick={() => void add(preset, "preset")}>{preset}</button>)}</div>
            <form className="criterion-add-form" onSubmit={(event) => { event.preventDefault(); void add(customLabel, "custom"); }}><label className="field"><span>自由入力</span><input aria-label="自由入力の反応項目" value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} /></label><button className="primary-button" disabled={disabled} type="submit">追加</button></form>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CandidateCommentComposer({
  candidate,
  selectedParticipantId,
  disabled,
  onSave
}: {
  candidate: CandidateSummary;
  selectedParticipantId: string | null;
  disabled: boolean;
  onSave: (text: string) => Promise<boolean>;
}) {
  const selectedRow = candidate.respondents.find(
    (row) => row.participant.id === selectedParticipantId
  );
  const [comment, setComment] = useState(selectedRow?.comment?.text ?? "");

  useEffect(
    () => setComment(selectedRow?.comment?.text ?? ""),
    [selectedParticipantId, selectedRow?.comment?.text]
  );

  return (
    <section className="candidate-comment-composer" aria-labelledby="candidate-comment-heading">
      <label className="field">
        <span id="candidate-comment-heading">コメント</span>
        <textarea
          aria-label="コメント"
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      <button
        className="primary-button"
        disabled={disabled}
        type="button"
        onClick={() => void onSave(comment)}
      >
        保存
      </button>
    </section>
  );
}

function CandidateInfoEditor({
  state,
  candidate,
  disabled,
  runMutation,
  onDeleted
}: {
  state: EventState;
  candidate: CandidateSummary;
  disabled: boolean;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(candidate.candidate.title ?? "");
  const [url, setUrl] = useState(candidate.candidate.url ?? "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [proposer, setProposer] = useState(candidate.candidate.created_by ?? "");
  const [confirm, setConfirm] = useState<{ field: "title" | "url" | "created_by"; value: string | null; label: string } | null>(null);

  useEffect(() => {
    setUrl(candidate.candidate.url ?? "");
  }, [candidate.candidate.url]);

  function requestChange(
    field: "title" | "url" | "created_by",
    value: string | null,
    label: string
  ) {
    if (field === "url") {
      const urlResult = normalizeCandidateUrl(value);
      if (urlResult.error) {
        setUrlError(candidateUrlErrorMessage(urlResult.error));
        return;
      }
      setUrlError(null);
      setConfirm({ field, value: urlResult.value, label });
      return;
    }
    setConfirm({ field, value, label });
  }

  async function applyChange() {
    if (!confirm) return;
    const ok = await runMutation(() => updateCandidateAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id, field: confirm.field, value: confirm.value }));
    if (ok) {
      if (confirm.field === "url") setUrl(confirm.value ?? "");
      setConfirm(null);
    }
  }

  return (
    <div className="detail-management-menu">
      <button aria-controls="candidate-info-editor-panel" aria-expanded={open} className="candidate-inline-editor-trigger" type="button" onClick={() => setOpen((value) => !value)}>候補内容の編集</button>
      {open ? <div className="detail-management-panel" id="candidate-info-editor-panel"><div className="candidate-info-editor"><label className="field"><span>候補名</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><button className="text-button" type="button" onClick={() => requestChange("title", title, "候補名")}>変更</button><label className="field"><span>リンク</span><input aria-describedby={urlError ? "candidate-edit-url-error" : undefined} aria-invalid={urlError ? "true" : undefined} value={url} onChange={(event) => { setUrl(event.target.value); setUrlError(null); }} />{urlError ? <span className="form-message error" id="candidate-edit-url-error" role="alert">{urlError}</span> : null}</label><button className="text-button" type="button" onClick={() => requestChange("url", url, "リンク")}>変更</button><label className="field"><span>提案者</span><select value={proposer} onChange={(event) => setProposer(event.target.value)}><option value="">ー</option>{state.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.display_name}</option>)}</select></label><button className="text-button" type="button" onClick={() => requestChange("created_by", proposer || null, "提案者")}>変更</button></div><TwoStepDeleteDialog disabled={disabled} firstMessage="この候補を削除しますか？" triggerLabel="候補を削除" onConfirm={async () => { const ok = await runMutation(() => deleteCandidateAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id })); if (ok) onDeleted(); return ok; }} /></div> : null}
      {confirm ? <section aria-modal="true" className="confirm-dialog" role="dialog"><p>{confirm.label}を変更しますか？</p><div className="dialog-actions"><button className="primary-button" disabled={disabled} type="button" onClick={() => void applyChange()}>変更</button><button className="text-button" type="button" onClick={() => setConfirm(null)}>キャンセル</button></div></section> : null}
    </div>
  );
}

function ParticipantEditor({
  participant,
  disabled,
  onRename,
  onDelete
}: {
  participant: ParticipantRecord | null;
  disabled: boolean;
  onRename: (participant: ParticipantRecord, displayName: string) => Promise<boolean>;
  onDelete: (participant: ParticipantRecord) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(participant?.display_name ?? "");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (open && participant) setDisplayName(participant.display_name);
  }, [open, participant]);

  async function rename() {
    if (!participant) return;
    const ok = await onRename(participant, displayName);
    if (ok) setOpen(false);
  }

  async function remove() {
    if (!participant) return;
    const ok = await onDelete(participant);
    if (ok) {
      setDeleteStep(0);
      setOpen(false);
    }
  }

  function close() {
    setDeleteStep(0);
    setOpen(false);
  }

  return (
    <>
      <button
        aria-controls="participant-editor-dialog"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-button candidate-modal-trigger"
        disabled={disabled || !participant}
        type="button"
        onClick={() => { setDeleteStep(0); setOpen(true); }}
      >
        判断者名の変更／削除
      </button>
      {open && participant ? (
        <section aria-labelledby="participant-editor-title" aria-modal="true" className="modal-backdrop" id="participant-editor-dialog" role="dialog">
          <div className="modal-panel participant-editor-dialog">
            {deleteStep ? (
              <>
                <h2 id="participant-editor-title">判断者を削除</h2>
                <p>{deleteStep === 1 ? `${participant.display_name}の回答を削除しますか？` : "本当によろしいですか？"}</p>
                <div className="dialog-actions participant-delete-confirmation-actions">
                  <button className="danger-button" disabled={disabled} type="button" onClick={() => { if (deleteStep === 1) setDeleteStep(2); else void remove(); }}>消す</button>
                  <button className="text-button" type="button" onClick={() => setDeleteStep(0)}>キャンセル</button>
                </div>
              </>
            ) : (
              <>
                <div className="detail-editor-dialog-heading">
                  <h2 id="participant-editor-title">判断者名の変更／削除</h2>
                  <button aria-label="判断者名の変更／削除を閉じる" className="icon-menu-button" type="button" onClick={close}>×</button>
                </div>
                <label className="field">
                  <span>判断者名</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </label>
                <div className="participant-editor-actions">
                  <button className="primary-button" disabled={disabled} type="button" onClick={() => void rename()}>変更</button>
                  <button className="text-button" type="button" onClick={close}>キャンセル</button>
                  <button className="danger-button participant-editor-delete" disabled={disabled} type="button" onClick={() => setDeleteStep(1)}>削除</button>
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}

function CandidateDetail({
  state,
  candidate,
  selectedParticipantId,
  disabled,
  onRequestName,
  onRename,
  onDeleteParticipant,
  onVote,
  onReaction,
  onConcern,
  onSaveComment,
  runMutation
}: {
  state: EventState;
  candidate: CandidateSummary;
  selectedParticipantId: string | null;
  disabled: boolean;
  onRequestName: () => void;
  onRename: (participant: ParticipantRecord, displayName: string) => Promise<boolean>;
  onDeleteParticipant: (participant: ParticipantRecord) => Promise<boolean>;
  onVote: (candidateId: string, value: VoteValue) => Promise<boolean>;
  onReaction: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  onConcern: (candidateId: string, criterionId: string, enabled: boolean) => Promise<boolean>;
  onSaveComment: (text: string) => Promise<boolean>;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
}) {
  const router = useRouter();
  const [criterionPickerOpen, setCriterionPickerOpen] = useState(false);
  const [criterionEditorOpen, setCriterionEditorOpen] = useState(false);
  const selected = state.participants.find((participant) => participant.id === selectedParticipantId) ?? null;
  const label = candidate.candidate.title || "リンク候補";

  return (
    <>
      <div className="candidate-detail-identity-bar">
        <strong>{selected ? `${selected.display_name}として判断中` : "お名前を選んで判断"}</strong>
        <button className="quiet-edit-button" disabled={disabled} type="button" onClick={onRequestName}>
          {selected ? "変更" : "お名前を選ぶ"}
        </button>
      </div>
      <article className={`candidate-detail-header decision-${candidate.decisionState}`} aria-label={decisionLabels[candidate.decisionState]}>
        <CandidateHeader linked={false} summary={candidate} shareToken={state.event.share_token} />
        <div className="candidate-detail-action-bar">
          <CandidateVoteControls
            candidate={candidate}
            disabled={disabled}
            selectedParticipantId={selectedParticipantId}
            onVote={onVote}
          />
          <button
            aria-controls="candidate-detail-criterion-picker"
            aria-expanded={criterionPickerOpen}
            aria-haspopup="dialog"
            aria-label={`${label}のハート、合計${candidate.heartCount}、判断基準を選ぶ`}
            className="dashboard-summary-reaction-trigger heart"
            disabled={disabled}
            type="button"
            onClick={() => setCriterionPickerOpen(true)}
          >
            <span aria-hidden="true">❤️</span>
            <span>{candidate.heartCount}</span>
          </button>
          <button
            aria-controls="candidate-detail-criterion-picker"
            aria-expanded={criterionPickerOpen}
            aria-haspopup="dialog"
            aria-label={`${label}の気になる、合計${candidate.concernCount}、判断基準を選ぶ`}
            className="dashboard-summary-reaction-trigger concern"
            disabled={disabled}
            type="button"
            onClick={() => setCriterionPickerOpen(true)}
          >
            <span aria-hidden="true">🌀</span>
            <span>{candidate.concernCount}</span>
          </button>
        </div>
        <CandidateCommentComposer
          candidate={candidate}
          disabled={disabled}
          selectedParticipantId={selectedParticipantId}
          onSave={onSaveComment}
        />
      </article>
      <section className="respondents-section" aria-labelledby="respondents-heading">
        <div className="section-title-row"><h2 id="respondents-heading">みんなの判断</h2></div>
        <div className="respondent-table-header" aria-hidden="true"><span>お名前</span><span>総合評価</span><span>判断基準への反応</span><span>コメント</span></div>
        <div className="respondent-rows">
          {candidate.respondents.map((row) => <article className="respondent-row readonly" key={row.participant.id}><strong>{row.participant.display_name}</strong><span className="readonly-evaluation">{evaluationLabels[row.evaluation]}</span><span className="readonly-reactions">{state.criteria.map((criterion) => <span key={criterion.id}>{criterion.label}{row.reactionCriterionIds.includes(criterion.id) ? " ❤️" : ""}{row.concernCriterionIds.includes(criterion.id) ? " 🌀" : ""}</span>)}</span><span className="readonly-comment">{row.comment?.text || "コメントなし"}</span></article>)}
        </div>
        {state.participants.length === 0 ? <p className="empty-state">回答者はまだいません。</p> : null}
      </section>
      <section className="candidate-management" aria-label="詳細編集">
        <CandidateInfoEditor state={state} candidate={candidate} disabled={disabled} runMutation={runMutation} onDeleted={() => router.push(`/e/${state.event.share_token}`)} />
        <button
          aria-controls="candidate-detail-criterion-editor"
          aria-expanded={criterionEditorOpen}
          aria-haspopup="dialog"
          className="text-button candidate-modal-trigger"
          disabled={disabled}
          type="button"
          onClick={() => setCriterionEditorOpen(true)}
        >
          ❤️／🌀反応項目の編集
        </button>
        <ParticipantEditor participant={selected} disabled={disabled} onRename={onRename} onDelete={onDeleteParticipant} />
      </section>
      {criterionPickerOpen ? (
        <CriterionFeedbackDialog
          candidate={candidate}
          criteria={state.criteria}
          dialogId="candidate-detail-criterion-picker"
          disabled={disabled}
          selectedParticipantId={selectedParticipantId}
          onClose={() => setCriterionPickerOpen(false)}
          onConcern={onConcern}
          onEditCriteria={() => {
            setCriterionPickerOpen(false);
            setCriterionEditorOpen(true);
          }}
          onReaction={onReaction}
        />
      ) : null}
      {criterionEditorOpen ? (
        <CriteriaEditorDialog
          candidate={candidate}
          criteria={state.criteria}
          dialogId="candidate-detail-criterion-editor"
          disabled={disabled}
          eventId={state.event.id}
          onClose={() => setCriterionEditorOpen(false)}
          runMutation={runMutation}
          selectedParticipantId={selectedParticipantId}
          shareToken={state.event.share_token}
        />
      ) : null}
    </>
  );
}

export function EventApp({
  initialState,
  isOwner,
  origin,
  ownerToken,
  initialSetup = false,
  candidateId
}: EventAppProps) {
  const [state, setState] = useState(initialState);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [selectionReady, setSelectionReady] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [selectorError, setSelectorError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<ParticipantRecord | null>(null);
  const [namePrompt, setNamePrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sharedReady, setSharedReady] = useState(!ownerToken);
  const pendingOperation = useRef<PendingRequest | null>(null);
  const resolvingName = useRef(false);
  const mutationInFlight = useRef(false);
  const explicitOperationIntent = useRef(false);
  const storageKey = `kimenosuke:selected-participant:${state.event.id}`;
  const disabled = pending || !sharedReady;

  function storeSelection(participantId: string | null) {
    setSelectedParticipantId(participantId);
    if (participantId) localStorage.setItem(storageKey, participantId);
    else localStorage.removeItem(storageKey);
  }

  function completePending(succeeded: boolean) {
    const request = pendingOperation.current;
    pendingOperation.current = null;
    request?.complete(succeeded);
  }

  async function resumePending(participantId: string) {
    const request = pendingOperation.current;
    if (!request) return;
    pendingOperation.current = null;
    const succeeded = await request.run(participantId);
    request.complete(succeeded);
  }

  function selectExisting(participant: ParticipantRecord) {
    setDraftName(participant.display_name);
    setSelectorError(null);
    setNamePrompt(false);
    storeSelection(participant.id);
    void resumePending(participant.id);
  }

  async function commitDraft(reason: "enter" | "blur" | "explicit"): Promise<boolean> {
    if (reason === "blur" && explicitOperationIntent.current) return false;
    if (resolvingName.current || !draftName.trim()) return false;
    const selected = state.participants.find((participant) => participant.id === selectedParticipantId);
    if (selected?.display_name === draftName.trim()) return true;
    resolvingName.current = true;
    setPending(true);
    const result = await resolveParticipantAction({ eventId: state.event.id, shareToken: state.event.share_token, displayName: draftName });
    resolvingName.current = false;
    setPending(false);
    if (!result.data) {
      setSelectorError(result.error);
      completePending(false);
      return false;
    }
    if (result.data.status === "duplicate") {
      setDuplicate(result.data.participant);
      return false;
    }
    setState(result.data.state);
    selectExisting(result.data.participant);
    return true;
  }

  async function runMutation(operation: () => Promise<MutationResult<EventState>>): Promise<boolean> {
    if (mutationInFlight.current) return false;
    mutationInFlight.current = true;
    setPending(true);
    try {
      const result = await operation();
      if (!result.data) { setError(result.error); return false; }
      setState(result.data);
      setError(null);
      return true;
    } catch {
      setError("操作を完了できませんでした。もう一度お試しください。");
      return false;
    } finally {
      mutationInFlight.current = false;
      setPending(false);
    }
  }

  async function createCandidateWithSelection(title: string, url: string) {
    explicitOperationIntent.current = false;
    const selected = state.participants.find((participant) => participant.id === selectedParticipantId);
    const operation = (participantId: string | null) => runMutation(() => createCandidateAction({ eventId: state.event.id, shareToken: state.event.share_token, title, url, createdBy: participantId }));
    if (draftName.trim() && draftName.trim() !== selected?.display_name) {
      if (pendingOperation.current) return false;
      return new Promise<boolean>((complete) => {
        pendingOperation.current = {
          run: operation,
          complete
        };
        if (!resolvingName.current) void commitDraft("explicit");
      });
    }
    return operation(selectedParticipantId);
  }

  async function runWithParticipant(
    operation: (participantId: string) => Promise<boolean>
  ): Promise<boolean> {
    if (selectedParticipantId) return operation(selectedParticipantId);
    if (pendingOperation.current) return false;

    return new Promise<boolean>((complete) => {
      pendingOperation.current = { run: operation, complete };
      setNamePrompt(true);
    });
  }

  async function updateEventDetails(title: string, memo: string) {
    return runMutation(() => updateEventAction({ eventId: state.event.id, shareToken: state.event.share_token, ownerToken, title, memo }));
  }

  function requestParticipant() {
    setNamePrompt(true);
  }

  function markCandidateIntent() {
    explicitOperationIntent.current = true;
    window.setTimeout(() => {
      explicitOperationIntent.current = false;
    }, 0);
  }

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored && state.participants.some((participant) => participant.id === stored)) {
      setSelectedParticipantId(stored);
      const participant = state.participants.find((row) => row.id === stored);
      if (participant) setDraftName(participant.display_name);
    } else {
      localStorage.removeItem(storageKey);
    }
    setSelectionReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (selectedParticipantId && !state.participants.some((participant) => participant.id === selectedParticipantId)) {
      storeSelection(null);
    }
  }, [state.participants, selectedParticipantId]);

  useEffect(() => {
    if (initialSetup) {
      const url = new URL(window.location.href);
      url.searchParams.delete("created");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  }, [initialSetup]);

  useEffect(() => {
    if (!ownerToken) return;
    let active = true;
    void fetch(`/api/owner-session/${ownerToken}`, { method: "POST" }).then((response) => {
      if (!active) return;
      if (!response.ok) { setError("オーナー情報を確認できませんでした。"); return; }
      setSharedReady(true);
    }).catch(() => { if (active) setError("オーナー情報を確認できませんでした。"); });
    return () => { active = false; };
  }, [ownerToken]);

  const selectedCandidate = candidateId
    ? state.candidates.find((summary) => summary.candidate.id === candidateId)
    : null;
  const showGuestSelector = selectionReady && !isOwner && !selectedParticipantId;
  const viewMode: EventViewMode = !selectionReady
    ? "loading"
    : showGuestSelector
      ? "guest-selection"
      : initialSetup && ownerToken
        ? "owner-setup"
        : selectedCandidate
          ? "candidate-detail"
          : "dashboard";

  return (
    <main className="page-shell event-app">
      <EventTopbar shareToken={state.event.share_token} viewMode={viewMode} />
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
      {!selectionReady ? <p className="loading-state">読み込み中...</p> : showGuestSelector ? <div className="event-surface"><EventHeading state={state} isOwner={false} disabled={disabled} onUpdate={updateEventDetails} /><section className="name-selection"><h2>あなたのお名前</h2><RespondentSelector participants={state.participants} draft={draftName} error={selectorError} disabled={disabled} onDraftChange={(value) => { setDraftName(value); setSelectorError(null); }} onSelect={selectExisting} onCommit={(reason) => void commitDraft(reason)} /></section></div> : initialSetup && ownerToken ? <div className="event-surface"><OwnerSetup state={state} origin={origin} ownerToken={ownerToken} isOwner={isOwner} selectedParticipantId={selectedParticipantId} disabled={disabled} draftName={draftName} selectorError={selectorError} onDraftChange={(value) => { setDraftName(value); setSelectorError(null); }} onSelect={selectExisting} onCommit={(reason) => void commitDraft(reason)} onCandidateIntentStart={markCandidateIntent} onUpdateEvent={updateEventDetails} onCreateCandidate={createCandidateWithSelection} /></div> : selectedCandidate ? <div className="event-surface candidate-detail-surface"><CandidateDetail state={state} candidate={selectedCandidate} selectedParticipantId={selectedParticipantId} disabled={disabled} onRequestName={() => requestParticipant()} onRename={async (participant, displayName) => { const ok = await runMutation(() => renameParticipantAction({ eventId: state.event.id, shareToken: state.event.share_token, participantId: participant.id, displayName })); if (ok) setDraftName(displayName.trim()); return ok; }} onDeleteParticipant={async (participant) => { const ok = await runMutation(() => deleteParticipantAction({ eventId: state.event.id, shareToken: state.event.share_token, participantId: participant.id })); if (ok) storeSelection(null); return ok; }} onVote={(candidateId, value) => runWithParticipant((participantId) => runMutation(() => setVoteAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId, participantId, value })))} onReaction={(candidateId, criterionId, enabled) => runWithParticipant((participantId) => runMutation(() => setReactionAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId, participantId, criterionId, enabled })))} onConcern={(candidateId, criterionId, enabled) => runWithParticipant((participantId) => runMutation(() => setConcernAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId, participantId, criterionId, enabled })))} onSaveComment={(text) => runWithParticipant((participantId) => runMutation(() => saveCommentAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: selectedCandidate.candidate.id, participantId, text })))} runMutation={runMutation} /></div> : <div className="event-surface"><Dashboard state={state} isOwner={isOwner} origin={origin} ownerToken={ownerToken} selectedParticipantId={selectedParticipantId} disabled={disabled} onRequestName={requestParticipant} onUpdateEvent={updateEventDetails} onCreateCandidate={createCandidateWithSelection} onVote={(candidateId, value) => runWithParticipant((participantId) => runMutation(() => setVoteAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId, participantId, value })))} onReaction={(candidateId, criterionId, enabled) => runWithParticipant((participantId) => runMutation(() => setReactionAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId, participantId, criterionId, enabled })))} onConcern={(candidateId, criterionId, enabled) => runWithParticipant((participantId) => runMutation(() => setConcernAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId, participantId, criterionId, enabled })))} runMutation={runMutation} /></div>}

      {namePrompt ? <section aria-modal="true" className="modal-backdrop" role="dialog"><div className="modal-panel"><h2>あなたのお名前</h2><RespondentSelector participants={state.participants} draft={draftName} error={selectorError} disabled={disabled} onDraftChange={(value) => { setDraftName(value); setSelectorError(null); }} onSelect={selectExisting} onCommit={(reason) => void commitDraft(reason)} /><button className="text-button" type="button" onClick={() => { setNamePrompt(false); completePending(false); }}>キャンセル</button></div></section> : null}

      {duplicate ? <section aria-modal="true" className="modal-backdrop" role="dialog"><div className="modal-panel"><h2>「{duplicate.display_name}」はすでにあります</h2><p>同じ人ですか？</p><div className="dialog-actions"><button className="primary-button" type="button" onClick={() => { const participant = duplicate; setDuplicate(null); selectExisting(participant); }}>同じ人です</button><button className="text-button" type="button" onClick={() => { setDuplicate(null); setSelectorError("別の名前を入力してください。"); }}>別の人です</button></div></div></section> : null}

    </main>
  );
}
