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
import { CopyButton } from "@/components/CopyButton";
import { RespondentSelector } from "@/components/RespondentSelector";
import { TwoStepDeleteDialog } from "@/components/TwoStepDeleteDialog";
import {
  CANDIDATE_TITLE_PLACEHOLDER,
  CRITERION_PRESETS
} from "@/lib/constants";
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

function EventTopbar({ shareToken }: { shareToken: string }) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        きめのすけ
      </a>
      <a className="event-nav-link" href={`/e/${shareToken}`}>
        候補一覧
      </a>
    </header>
  );
}

function EvaluationChips({ candidate }: { candidate: CandidateSummary }) {
  return (
    <div className="evaluation-chips" aria-label="総合評価の集計">
      <span className="evaluation-chip positive">⭕️ <b>{candidate.positiveCount}</b></span>
      <span className="evaluation-chip neutral">➖ <b>{candidate.neutralCount}</b></span>
      <span className="evaluation-chip veto">❌ <b>{candidate.vetoCount}</b></span>
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
      <div className="candidate-title-row">
        {title}
        <EvaluationChips candidate={summary} />
      </div>
      {summary.candidate.url ? (
        <a className="candidate-url" href={summary.candidate.url} rel="noreferrer" target="_blank">
          {summary.candidate.url}
        </a>
      ) : (
        <span className="candidate-url muted">URLなし</span>
      )}
      <p className="candidate-meta">
        {summary.relativeCreatedAt} ・ 提案者 {summary.proposerName ?? "ー"}
      </p>
      <p className="feedback-totals" aria-label="参考情報">
        <span>❤️ {summary.heartCount}</span>
        <span>🌀 {summary.concernCount}</span>
      </p>
    </div>
  );
}

function CandidateCard({
  summary,
  shareToken
}: {
  summary: CandidateSummary;
  shareToken: string;
}) {
  return (
    <article
      aria-label={`${summary.candidate.title || "リンク候補"}、${decisionLabels[summary.decisionState]}`}
      className={`candidate-summary-card decision-${summary.decisionState}`}
      data-decision-state={summary.decisionState}
    >
      <CandidateHeader summary={summary} shareToken={shareToken} />
    </article>
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
          <label className="field"><span>お題</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field"><span>メモ</span><textarea rows={4} value={memo} onChange={(event) => setMemo(event.target.value)} /></label>
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

  return (
    <form
      className="candidate-add-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onCreate(title, url).then((ok) => {
          if (ok) {
            setTitle("");
            setUrl("");
          }
        });
      }}
    >
      <label className="field"><span>候補</span><input aria-label="候補" disabled={disabled} placeholder={CANDIDATE_TITLE_PLACEHOLDER} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="field"><span>リンク</span><input aria-label="リンク" disabled={disabled} type="url" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
      <button className="primary-button" disabled={disabled} type="submit" onPointerDown={onIntentStart}>追加</button>
    </form>
  );
}

function Dashboard({
  state,
  isOwner,
  disabled,
  onUpdateEvent,
  onCreateCandidate
}: {
  state: EventState;
  isOwner: boolean;
  disabled: boolean;
  onUpdateEvent: (title: string, memo: string) => Promise<boolean>;
  onCreateCandidate: (title: string, url: string) => Promise<boolean>;
}) {
  return (
    <>
      <EventHeading state={state} isOwner={isOwner} disabled={disabled} onUpdate={onUpdateEvent} />
      <section className="dashboard-section" aria-labelledby="candidate-list-heading">
        <h2 id="candidate-list-heading">候補</h2>
        <div className="candidate-dashboard-grid">
          {state.candidates.map((summary) => (
            <CandidateCard key={summary.candidate.id} summary={summary} shareToken={state.event.share_token} />
          ))}
        </div>
        {state.candidates.length === 0 ? <p className="empty-state">候補はまだありません。</p> : null}
        <CandidateAddForm disabled={disabled} onCreate={onCreateCandidate} />
      </section>
    </>
  );
}

function OwnerSetup({
  state,
  origin,
  ownerToken,
  isOwner,
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
  disabled: boolean;
  draftName: string;
  selectorError: string | null;
  onDraftChange: (value: string) => void;
  onSelect: (participant: ParticipantRecord) => void;
  onCommit: (reason: "enter" | "blur") => void;
  onCandidateIntentStart: () => void;
  onUpdateEvent: (title: string, memo: string) => Promise<boolean>;
  onCreateCandidate: (title: string, url: string) => Promise<boolean>;
}) {
  const shareUrl = `${origin}/e/${state.event.share_token}`;
  const ownerUrl = `${origin}/o/${ownerToken}`;

  return (
    <>
      <EventHeading state={state} isOwner={isOwner} disabled={disabled} onUpdate={onUpdateEvent} />
      <ol className="setup-steps">
        <li><h2>お名前を入れる</h2><p>まず、あなたのお名前を入力します。ここで選んだ名前が、候補や回答の名義になります。</p></li>
        <li><h2>候補を挙げる</h2><p>次に、みんなで比べたい候補を挙げます。候補名だけでも、リンクだけでも追加できます。</p></li>
        <li><h2>URLを送る</h2><p>候補がそろったら、みんなにリンクを送って、決めていきましょう。メールやLINEなど、なんでもいいよ。あなた専用リンクは保存しておいてくださいね。</p></li>
      </ol>
      <section className="setup-action"><h2><span>1.</span> お名前を入れる</h2><RespondentSelector participants={state.participants} draft={draftName} error={selectorError} disabled={disabled} onDraftChange={onDraftChange} onSelect={onSelect} onCommit={onCommit} /></section>
      <section className="setup-action"><h2><span>2.</span> 候補を挙げる</h2><CandidateAddForm disabled={disabled} onIntentStart={onCandidateIntentStart} onCreate={onCreateCandidate} /></section>
      <section className="setup-action"><h2><span>3.</span> URLを送る</h2><div className="setup-links"><div className="setup-link share"><span>みんなに送るリンク</span><code>{shareUrl}</code><CopyButton value={shareUrl} /></div><div className="setup-link owner"><span>あなた専用リンク</span><code>{ownerUrl}</code><CopyButton value={ownerUrl} label="保存" /></div></div></section>
    </>
  );
}

function CriteriaManager({
  state,
  candidate,
  selectedParticipantId,
  disabled,
  runMutation
}: {
  state: EventState;
  candidate: CandidateSummary;
  selectedParticipantId: string | null;
  disabled: boolean;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const existingLabels = new Set(state.criteria.map((criterion) => criterion.label.trim()));

  async function add(label: string, source: "preset" | "custom") {
    const ok = await runMutation(() =>
      createCriterionAction({
        eventId: state.event.id,
        shareToken: state.event.share_token,
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
    <section className="criteria-manager" aria-labelledby="criteria-heading">
      <div className="section-title-row"><h2 id="criteria-heading">判断基準</h2><button className="text-button" disabled={disabled} type="button" onClick={() => setAdding((value) => !value)}>＋ 判断基準</button></div>
      {adding ? (
        <div className="criteria-add-panel">
          <div className="criterion-presets">{CRITERION_PRESETS.filter((preset) => !existingLabels.has(preset)).map((preset) => <button className="preset-button" disabled={disabled} key={preset} type="button" onClick={() => void add(preset, "preset")}>{preset}</button>)}</div>
          <form className="criterion-add-form" onSubmit={(event) => { event.preventDefault(); void add(customLabel, "custom"); }}><label className="field"><span>自由入力</span><input aria-label="自由入力の判断基準" value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} /></label><button className="primary-button" disabled={disabled} type="submit">追加</button></form>
        </div>
      ) : null}
      <ul className="criterion-overview-list">
        {state.criteria.map((criterion) => {
          const heartPeople = candidate.respondents.filter((row) => row.reactionCriterionIds.includes(criterion.id)).map((row) => row.participant.display_name);
          const concernPeople = candidate.respondents.filter((row) => row.concernCriterionIds.includes(criterion.id)).map((row) => row.participant.display_name);
          return (
            <li key={criterion.id}>
              <div className="criterion-overview"><strong>{criterion.label}</strong><span>❤️ {heartPeople.length}</span><span>🌀 {concernPeople.length}</span><small>{[...heartPeople, ...concernPeople].filter((name, index, rows) => rows.indexOf(name) === index).join("、") || "ー"}</small><button aria-label={`${criterion.label}のメニュー`} className="icon-menu-button" type="button" onClick={() => { setEditingId(editingId === criterion.id ? null : criterion.id); setEditLabel(criterion.label); }}>…</button></div>
              {editingId === criterion.id ? <div className="criterion-menu"><label className="field"><span>判断基準</span><input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} /></label><button className="text-button" disabled={disabled} type="button" onClick={() => void runMutation(() => updateCriterionAction({ eventId: state.event.id, shareToken: state.event.share_token, criterionId: criterion.id, label: editLabel })).then((ok) => { if (ok) setEditingId(null); })}>保存</button><TwoStepDeleteDialog disabled={disabled} firstMessage={`${criterion.label}を削除しますか？`} triggerLabel="削除" onConfirm={() => runMutation(() => deleteCriterionAction({ eventId: state.event.id, shareToken: state.event.share_token, criterionId: criterion.id }))} /></div> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SelectedRespondentControls({
  state,
  candidate,
  participant,
  disabled,
  runMutation
}: {
  state: EventState;
  candidate: CandidateSummary;
  participant: ParticipantRecord;
  disabled: boolean;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
}) {
  const row = candidate.respondents.find((item) => item.participant.id === participant.id)!;
  const [comment, setComment] = useState(row.comment?.text ?? "");

  useEffect(() => setComment(row.comment?.text ?? ""), [row.comment?.text]);

  function vote(value: VoteValue) {
    if (row.evaluation === value) return;
    void runMutation(() => setVoteAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id, participantId: participant.id, value }));
  }

  return (
    <div className="selected-respondent-controls">
      <div className="vote-controls" aria-label="総合評価">
        {(["positive", "neutral", "veto"] as const).map((value) => <button aria-pressed={row.evaluation === value} className={`vote-button ${value}`} disabled={disabled} key={value} type="button" onClick={() => vote(value)}>{evaluationLabels[value]}</button>)}
      </div>
      <div className="criterion-response-grid">
        {state.criteria.map((criterion) => {
          const heart = row.reactionCriterionIds.includes(criterion.id);
          const concern = row.concernCriterionIds.includes(criterion.id);
          return <div className="criterion-response" key={criterion.id}><span>{criterion.label}</span><button aria-label={`${criterion.label}にハート`} aria-pressed={heart} className="reaction-button heart" disabled={disabled} type="button" onClick={() => void runMutation(() => setReactionAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id, participantId: participant.id, criterionId: criterion.id, enabled: !heart }))}>❤️</button><button aria-label={`${criterion.label}に気になる`} aria-pressed={concern} className="reaction-button concern" disabled={disabled} type="button" onClick={() => void runMutation(() => setConcernAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id, participantId: participant.id, criterionId: criterion.id, enabled: !concern }))}>🌀</button></div>;
        })}
      </div>
      <div className="respondent-comment"><label className="field"><span>コメント</span><textarea aria-label="コメント" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></label><button className="primary-button" disabled={disabled} type="button" onClick={() => void runMutation(() => saveCommentAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id, participantId: participant.id, text: comment }))}>保存</button></div>
    </div>
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
  const [proposer, setProposer] = useState(candidate.candidate.created_by ?? "");
  const [confirm, setConfirm] = useState<{ field: "title" | "url" | "created_by"; value: string | null; label: string } | null>(null);

  async function applyChange() {
    if (!confirm) return;
    const ok = await runMutation(() => updateCandidateAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id, field: confirm.field, value: confirm.value }));
    if (ok) setConfirm(null);
  }

  return (
    <section className="candidate-management">
      <button className="text-button" type="button" onClick={() => setOpen((value) => !value)}>候補情報を編集</button>
      {open ? <div className="candidate-info-editor"><label className="field"><span>候補名</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><button className="text-button" type="button" onClick={() => setConfirm({ field: "title", value: title, label: "候補名" })}>変更</button><label className="field"><span>リンク</span><input value={url} onChange={(event) => setUrl(event.target.value)} /></label><button className="text-button" type="button" onClick={() => setConfirm({ field: "url", value: url, label: "リンク" })}>変更</button><label className="field"><span>提案者</span><select value={proposer} onChange={(event) => setProposer(event.target.value)}><option value="">ー</option>{state.participants.map((participant) => <option key={participant.id} value={participant.id}>{participant.display_name}</option>)}</select></label><button className="text-button" type="button" onClick={() => setConfirm({ field: "created_by", value: proposer || null, label: "提案者" })}>変更</button></div> : null}
      <TwoStepDeleteDialog disabled={disabled} firstMessage="この候補を削除しますか？" triggerLabel="候補を削除" onConfirm={async () => { const ok = await runMutation(() => deleteCandidateAction({ eventId: state.event.id, shareToken: state.event.share_token, candidateId: candidate.candidate.id })); if (ok) onDeleted(); return ok; }} />
      {confirm ? <section aria-modal="true" className="confirm-dialog" role="dialog"><p>{confirm.label}を変更しますか？</p><div className="dialog-actions"><button className="primary-button" disabled={disabled} type="button" onClick={() => void applyChange()}>変更</button><button className="text-button" type="button" onClick={() => setConfirm(null)}>キャンセル</button></div></section> : null}
    </section>
  );
}

function CandidateDetail({
  state,
  candidate,
  selectedParticipantId,
  disabled,
  onSelectParticipant,
  onRequestName,
  onRename,
  onDeleteParticipant,
  runMutation
}: {
  state: EventState;
  candidate: CandidateSummary;
  selectedParticipantId: string | null;
  disabled: boolean;
  onSelectParticipant: (participant: ParticipantRecord) => void;
  onRequestName: () => void;
  onRename: (participant: ParticipantRecord) => void;
  onDeleteParticipant: (participant: ParticipantRecord) => Promise<boolean>;
  runMutation: (operation: () => Promise<MutationResult<EventState>>) => Promise<boolean>;
}) {
  const router = useRouter();
  const selected = state.participants.find((participant) => participant.id === selectedParticipantId) ?? null;

  return (
    <>
      <article className={`candidate-detail-header decision-${candidate.decisionState}`} aria-label={decisionLabels[candidate.decisionState]}><CandidateHeader linked={false} summary={candidate} shareToken={state.event.share_token} /></article>
      <CriteriaManager state={state} candidate={candidate} selectedParticipantId={selectedParticipantId} disabled={disabled} runMutation={runMutation} />
      <section className="respondents-section" aria-labelledby="respondents-heading">
        <div className="section-title-row"><h2 id="respondents-heading">みんなの判断</h2>{selected ? <div className="selected-identity"><strong>{selected.display_name}として判断中</strong><button className="text-button" type="button" onClick={() => onRename(selected)}>名前を変更</button><TwoStepDeleteDialog disabled={disabled} firstMessage={`${selected.display_name}の回答を削除しますか？`} triggerLabel="回答者を削除" onConfirm={() => onDeleteParticipant(selected)} /></div> : <button className="text-button" type="button" onClick={onRequestName}>お名前を選ぶ</button>}</div>
        <div className="respondent-table-header" aria-hidden="true"><span>お名前</span><span>総合評価</span><span>判断基準への反応</span><span>コメント</span></div>
        <div className="respondent-rows">
          {candidate.respondents.map((row) => row.participant.id === selectedParticipantId ? <article className="respondent-row selected" key={row.participant.id}><div className="respondent-name">{row.participant.display_name}</div><SelectedRespondentControls state={state} candidate={candidate} participant={row.participant} disabled={disabled} runMutation={runMutation} /></article> : <button className="respondent-row readonly" key={row.participant.id} type="button" onClick={() => onSelectParticipant(row.participant)}><strong>{row.participant.display_name}</strong><span className="readonly-evaluation">{evaluationLabels[row.evaluation]}</span><span className="readonly-reactions">{state.criteria.map((criterion) => <span key={criterion.id}>{criterion.label}{row.reactionCriterionIds.includes(criterion.id) ? " ❤️" : ""}{row.concernCriterionIds.includes(criterion.id) ? " 🌀" : ""}</span>)}</span><span className="readonly-comment">{row.comment?.text || "コメントなし"}</span></button>)}
        </div>
        {state.participants.length === 0 ? <p className="empty-state">回答者はまだいません。</p> : null}
      </section>
      <CandidateInfoEditor state={state} candidate={candidate} disabled={disabled} runMutation={runMutation} onDeleted={() => router.push(`/e/${state.event.share_token}`)} />
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
  const [renameTarget, setRenameTarget] = useState<ParticipantRecord | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
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

  async function updateEventDetails(title: string, memo: string) {
    return runMutation(() => updateEventAction({ eventId: state.event.id, shareToken: state.event.share_token, ownerToken, title, memo }));
  }

  function requestParticipant() {
    if (selectedParticipantId) return;
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

  return (
    <main className="page-shell event-app">
      <EventTopbar shareToken={state.event.share_token} />
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
      {!selectionReady ? <p className="loading-state">読み込み中...</p> : showGuestSelector ? <div className="event-surface"><EventHeading state={state} isOwner={false} disabled={disabled} onUpdate={updateEventDetails} /><section className="name-selection"><h2>あなたのお名前</h2><RespondentSelector participants={state.participants} draft={draftName} error={selectorError} disabled={disabled} onDraftChange={(value) => { setDraftName(value); setSelectorError(null); }} onSelect={selectExisting} onCommit={(reason) => void commitDraft(reason)} /></section></div> : initialSetup && ownerToken ? <div className="event-surface"><OwnerSetup state={state} origin={origin} ownerToken={ownerToken} isOwner={isOwner} disabled={disabled} draftName={draftName} selectorError={selectorError} onDraftChange={(value) => { setDraftName(value); setSelectorError(null); }} onSelect={selectExisting} onCommit={(reason) => void commitDraft(reason)} onCandidateIntentStart={markCandidateIntent} onUpdateEvent={updateEventDetails} onCreateCandidate={createCandidateWithSelection} /></div> : selectedCandidate ? <div className="event-surface candidate-detail-surface"><CandidateDetail state={state} candidate={selectedCandidate} selectedParticipantId={selectedParticipantId} disabled={disabled} onSelectParticipant={selectExisting} onRequestName={() => requestParticipant()} onRename={(participant) => { setRenameTarget(participant); setRenameDraft(participant.display_name); }} onDeleteParticipant={async (participant) => { const ok = await runMutation(() => deleteParticipantAction({ eventId: state.event.id, shareToken: state.event.share_token, participantId: participant.id })); if (ok) storeSelection(null); return ok; }} runMutation={runMutation} /></div> : <div className="event-surface"><Dashboard state={state} isOwner={isOwner} disabled={disabled} onUpdateEvent={updateEventDetails} onCreateCandidate={createCandidateWithSelection} /></div>}

      {namePrompt ? <section aria-modal="true" className="modal-backdrop" role="dialog"><div className="modal-panel"><h2>あなたのお名前</h2><RespondentSelector participants={state.participants} draft={draftName} error={selectorError} disabled={disabled} onDraftChange={(value) => { setDraftName(value); setSelectorError(null); }} onSelect={selectExisting} onCommit={(reason) => void commitDraft(reason)} /><button className="text-button" type="button" onClick={() => { setNamePrompt(false); completePending(false); }}>キャンセル</button></div></section> : null}

      {duplicate ? <section aria-modal="true" className="modal-backdrop" role="dialog"><div className="modal-panel"><h2>「{duplicate.display_name}」はすでにあります</h2><p>同じ人ですか？</p><div className="dialog-actions"><button className="primary-button" type="button" onClick={() => { const participant = duplicate; setDuplicate(null); selectExisting(participant); }}>同じ人です</button><button className="text-button" type="button" onClick={() => { setDuplicate(null); setSelectorError("別の名前を入力してください。"); }}>別の人です</button></div></div></section> : null}

      {renameTarget ? <section aria-modal="true" className="modal-backdrop" role="dialog"><div className="modal-panel"><h2>名前を変更しますか？</h2><p>{renameTarget.display_name} → {renameDraft || "（未入力）"}</p><label className="field"><span>新しいお名前</span><input value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} /></label><div className="dialog-actions"><button className="primary-button" type="button" onClick={() => void runMutation(() => renameParticipantAction({ eventId: state.event.id, shareToken: state.event.share_token, participantId: renameTarget.id, displayName: renameDraft })).then((ok) => { if (ok) { setDraftName(renameDraft.trim()); setRenameTarget(null); } })}>変更</button><button className="text-button" type="button" onClick={() => setRenameTarget(null)}>キャンセル</button></div></div></section> : null}
    </main>
  );
}
