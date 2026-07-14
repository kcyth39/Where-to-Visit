import { getOwnerTokenCookie, setOwnerTokenCookie } from "@/lib/cookies";
import {
  COMMENT_MAX_LENGTH,
  CRITERION_LABEL_MAX_LENGTH,
  CRITERION_PRESETS,
  DEFAULT_CRITERION_LABEL
} from "@/lib/constants";
import { buildEventState } from "@/lib/event-state";
import type {
  CandidateRecord,
  CommentRecord,
  ConcernRecord,
  CriterionRecord,
  EventPageModel,
  EventRecord,
  EventState,
  MutationResult,
  ParticipantRecord,
  ParticipantResolution,
  ReactionRecord,
  VoteRecord,
  VoteValue
} from "@/lib/event-types";
import {
  getSupabaseServerClient,
  type SupabaseAccessTokens
} from "@/lib/supabase";
import { createToken } from "@/lib/tokens";

export type {
  CandidateRecord,
  CandidateSummary,
  CommentRecord,
  ConcernRecord,
  CriterionRecord,
  DecisionState,
  EvaluationState,
  EventPageModel,
  EventRecord,
  EventState,
  MutationResult,
  ParticipantRecord,
  ParticipantResolution,
  PendingOperation,
  ReactionRecord,
  RespondentCandidateView,
  VoteRecord,
  VoteValue
} from "@/lib/event-types";

const EVENT_COLUMNS = "id,title,memo,share_token,created_at";
const PARTICIPANT_COLUMNS = "id,event_id,display_name,created_at";
const CANDIDATE_COLUMNS = "id,event_id,title,url,created_by,created_at";
const CRITERION_COLUMNS = "id,event_id,label,source,created_by,created_at";
const VOTE_COLUMNS = "id,candidate_id,participant_id,value";
const REACTION_COLUMNS = "id,candidate_id,participant_id,criterion_id,created_at";
const CONCERN_COLUMNS = "id,candidate_id,participant_id,criterion_id,created_at";
const COMMENT_COLUMNS = "id,candidate_id,participant_id,text,created_at";

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: FormDataEntryValue | null): string | null {
  return text(value) || null;
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function configuredClient(tokens: SupabaseAccessTokens) {
  const result = getSupabaseServerClient(tokens);
  if (!result.client) return { data: null, error: result.configError } as const;
  return { data: result.client, error: null } as const;
}

export function parseEventInput(formData: FormData): MutationResult<{
  title: string;
  memo: string | null;
}> {
  const title = text(formData.get("title"));
  const memo = optionalText(formData.get("memo"));
  if (!title) return { data: null, error: "きめることを入力してください。" };
  return { data: { title, memo }, error: null };
}

export async function createEvent(formData: FormData): Promise<
  MutationResult<{ shareToken: string; ownerToken: string }>
> {
  const input = parseEventInput(formData);
  if (!input.data) return input;

  const shareToken = createToken();
  const ownerToken = createToken();
  const supabase = configuredClient({ shareToken, ownerToken });
  if (!supabase.data) return { data: null, error: supabase.error };

  const { data: event, error } = await supabase.data
    .from("events")
    .insert({
      title: input.data.title,
      memo: input.data.memo,
      share_token: shareToken,
      owner_token: ownerToken
    })
    .select(EVENT_COLUMNS)
    .single<EventRecord>();
  if (error || !event) {
    return { data: null, error: "イベントを作成できませんでした。" };
  }

  const { error: criterionError } = await supabase.data.from("criteria").insert({
    event_id: event.id,
    label: DEFAULT_CRITERION_LABEL,
    source: "default",
    created_by: null
  });
  if (criterionError) {
    return { data: null, error: "判断基準を作成できませんでした。" };
  }

  return { data: { shareToken, ownerToken }, error: null };
}

async function loadEventState(
  event: EventRecord,
  tokens: SupabaseAccessTokens
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient(tokens);
  if (!supabase.data) return { data: null, error: supabase.error };

  const [participants, candidates, criteria] = await Promise.all([
    supabase.data
      .from("participants")
      .select(PARTICIPANT_COLUMNS)
      .eq("event_id", event.id)
      .returns<ParticipantRecord[]>(),
    supabase.data
      .from("candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("event_id", event.id)
      .returns<CandidateRecord[]>(),
    supabase.data
      .from("criteria")
      .select(CRITERION_COLUMNS)
      .eq("event_id", event.id)
      .returns<CriterionRecord[]>()
  ]);
  if (participants.error || candidates.error || criteria.error) {
    return { data: null, error: "イベントの共同編集情報を取得できませんでした。" };
  }

  const candidateIds = (candidates.data ?? []).map((candidate) => candidate.id);
  let votes: VoteRecord[] = [];
  let reactions: ReactionRecord[] = [];
  let concerns: ConcernRecord[] = [];
  let comments: CommentRecord[] = [];

  if (candidateIds.length > 0) {
    const results = await Promise.all([
      supabase.data.from("votes").select(VOTE_COLUMNS).in("candidate_id", candidateIds).returns<VoteRecord[]>(),
      supabase.data.from("reactions").select(REACTION_COLUMNS).in("candidate_id", candidateIds).returns<ReactionRecord[]>(),
      supabase.data.from("concerns").select(CONCERN_COLUMNS).in("candidate_id", candidateIds).returns<ConcernRecord[]>(),
      supabase.data.from("comments").select(COMMENT_COLUMNS).in("candidate_id", candidateIds).returns<CommentRecord[]>()
    ]);
    if (results.some((result) => result.error)) {
      return { data: null, error: "評価・反応・コメントを取得できませんでした。" };
    }
    votes = results[0].data ?? [];
    reactions = results[1].data ?? [];
    concerns = results[2].data ?? [];
    comments = results[3].data ?? [];
  }

  return {
    data: buildEventState({
      event,
      participants: participants.data ?? [],
      candidates: candidates.data ?? [],
      criteria: criteria.data ?? [],
      votes,
      reactions,
      concerns,
      comments
    }),
    error: null
  };
}

async function eventById(
  eventId: string,
  tokens: SupabaseAccessTokens
): Promise<MutationResult<EventRecord>> {
  const supabase = configuredClient(tokens);
  if (!supabase.data) return { data: null, error: supabase.error };
  const { data, error } = await supabase.data
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle<EventRecord>();
  if (error || !data) return { data: null, error: "イベントが見つかりません。" };
  return { data, error: null };
}

export async function getEventByShareToken(
  shareToken: string
): Promise<MutationResult<EventPageModel>> {
  const ownerToken = await getOwnerTokenCookie();
  const tokens = { shareToken, ownerToken };
  const supabase = configuredClient(tokens);
  if (!supabase.data) return { data: null, error: supabase.error };
  const { data: event, error } = await supabase.data
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("share_token", shareToken)
    .maybeSingle<EventRecord>();
  if (error || !event) return { data: null, error: "イベントが見つかりません。" };

  let isOwner = false;
  if (ownerToken) {
    const ownerClient = configuredClient({ ownerToken });
    if (ownerClient.data) {
      const ownerCheck = await ownerClient.data
        .from("events")
        .select("id")
        .eq("id", event.id)
        .maybeSingle<{ id: string }>();
      isOwner = !ownerCheck.error && ownerCheck.data?.id === event.id;
    }
  }

  const state = await loadEventState(event, tokens);
  if (!state.data) return state;
  return { data: { state: state.data, isOwner }, error: null };
}

export async function getEventByOwnerToken(
  ownerToken: string
): Promise<MutationResult<EventPageModel>> {
  const tokens = { ownerToken };
  const supabase = configuredClient(tokens);
  if (!supabase.data) return { data: null, error: supabase.error };
  const { data: event, error } = await supabase.data
    .from("events")
    .select(EVENT_COLUMNS)
    .limit(1)
    .maybeSingle<EventRecord>();
  if (error || !event) return { data: null, error: "イベントが見つかりません。" };
  const state = await loadEventState(event, tokens);
  if (!state.data) return state;
  return { data: { state: state.data, isOwner: true }, error: null };
}

export async function claimOwnerSession(
  ownerToken: string
): Promise<MutationResult<{ shareToken: string }>> {
  const result = await getEventByOwnerToken(ownerToken);
  if (!result.data) return result;
  const shareToken = result.data.state.event.share_token;
  await setOwnerTokenCookie(ownerToken, shareToken);
  return { data: { shareToken }, error: null };
}

async function finish(eventId: string, shareToken: string): Promise<MutationResult<EventState>> {
  const event = await eventById(eventId, { shareToken });
  if (!event.data) return event;
  return loadEventState(event.data, { shareToken });
}

export async function refreshEventState(
  eventId: string,
  shareToken: string
): Promise<MutationResult<EventState>> {
  return finish(eventId, shareToken);
}

export async function updateEvent(
  eventId: string,
  shareToken: string,
  title: string,
  memo: string,
  providedOwnerToken?: string
): Promise<MutationResult<EventState>> {
  const ownerToken = providedOwnerToken || (await getOwnerTokenCookie());
  if (!ownerToken) return { data: null, error: "オーナー権限を確認できませんでした。" };
  const supabase = configuredClient({ ownerToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return { data: null, error: "きめることを入力してください。" };
  const { error } = await supabase.data
    .from("events")
    .update({ title: normalizedTitle, memo: memo.trim() || null })
    .eq("id", eventId);
  if (error) return { data: null, error: "イベントを更新できませんでした。" };
  return finish(eventId, shareToken);
}

export async function resolveParticipant(
  eventId: string,
  shareToken: string,
  displayName: string
): Promise<MutationResult<ParticipantResolution>> {
  const name = displayName.trim();
  if (codePointLength(name) < 1 || codePointLength(name) > 60) {
    return { data: null, error: "お名前は1〜60文字で入力してください。" };
  }
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };

  const existing = await supabase.data
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("event_id", eventId)
    .eq("display_name", name)
    .maybeSingle<ParticipantRecord>();
  if (existing.error) return { data: null, error: "お名前を確認できませんでした。" };
  if (existing.data) {
    return { data: { status: "duplicate", participant: existing.data }, error: null };
  }

  const inserted = await supabase.data
    .from("participants")
    .insert({ event_id: eventId, display_name: name })
    .select(PARTICIPANT_COLUMNS)
    .single<ParticipantRecord>();
  if (inserted.error || !inserted.data) {
    if (inserted.error?.code === "23505") {
      const raced = await supabase.data
        .from("participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("event_id", eventId)
        .eq("display_name", name)
        .maybeSingle<ParticipantRecord>();
      if (raced.data) {
        return { data: { status: "duplicate", participant: raced.data }, error: null };
      }
    }
    return { data: null, error: "お名前を登録できませんでした。" };
  }

  const state = await finish(eventId, shareToken);
  if (!state.data) return state;
  return {
    data: { status: "selected", participant: inserted.data, state: state.data },
    error: null
  };
}

export async function renameParticipant(
  eventId: string,
  shareToken: string,
  participantId: string,
  displayName: string
): Promise<MutationResult<EventState>> {
  const name = displayName.trim();
  if (codePointLength(name) < 1 || codePointLength(name) > 60) {
    return { data: null, error: "お名前は1〜60文字で入力してください。" };
  }
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data
    .from("participants")
    .update({ display_name: name })
    .eq("id", participantId)
    .eq("event_id", eventId);
  if (error) {
    return {
      data: null,
      error: error.code === "23505" ? "同じお名前がすでにあります。" : "お名前を変更できませんでした。"
    };
  }
  return finish(eventId, shareToken);
}

export async function deleteParticipant(
  eventId: string,
  shareToken: string,
  participantId: string
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data
    .from("participants")
    .delete()
    .eq("id", participantId)
    .eq("event_id", eventId);
  if (error) return { data: null, error: "回答者を削除できませんでした。" };
  return finish(eventId, shareToken);
}

export async function createCandidate(
  eventId: string,
  shareToken: string,
  title: string,
  url: string,
  createdBy: string | null
): Promise<MutationResult<EventState>> {
  const normalizedTitle = title.trim() || null;
  const normalizedUrl = url.trim() || null;
  if (!normalizedTitle && !normalizedUrl) {
    return { data: null, error: "候補名かリンクのどちらかを入力してください。" };
  }
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data.from("candidates").insert({
    event_id: eventId,
    title: normalizedTitle,
    url: normalizedUrl,
    created_by: createdBy
  });
  if (error) return { data: null, error: "候補を追加できませんでした。" };
  return finish(eventId, shareToken);
}

export async function updateCandidate(
  eventId: string,
  shareToken: string,
  candidateId: string,
  field: "title" | "url" | "created_by",
  value: string | null
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const normalized = field === "created_by" ? value || null : value?.trim() || null;
  const { error } = await supabase.data
    .from("candidates")
    .update({ [field]: normalized })
    .eq("id", candidateId)
    .eq("event_id", eventId);
  if (error) return { data: null, error: "候補情報を変更できませんでした。" };
  return finish(eventId, shareToken);
}

export async function deleteCandidate(
  eventId: string,
  shareToken: string,
  candidateId: string
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data
    .from("candidates")
    .delete()
    .eq("id", candidateId)
    .eq("event_id", eventId);
  if (error) return { data: null, error: "候補を削除できませんでした。" };
  return finish(eventId, shareToken);
}

export async function createCriterion(
  eventId: string,
  shareToken: string,
  label: string,
  source: "preset" | "custom",
  createdBy: string | null
): Promise<MutationResult<EventState>> {
  const normalized = label.trim();
  if (codePointLength(normalized) < 1 || codePointLength(normalized) > CRITERION_LABEL_MAX_LENGTH) {
    return { data: null, error: "判断基準は1〜60文字で入力してください。" };
  }
  if (source === "preset" && !(CRITERION_PRESETS as readonly string[]).includes(normalized)) {
    return { data: null, error: "判断基準の選択肢を確認できませんでした。" };
  }
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data.from("criteria").insert({
    event_id: eventId,
    label: normalized,
    source,
    created_by: createdBy
  });
  if (error) return { data: null, error: "判断基準を追加できませんでした。" };
  return finish(eventId, shareToken);
}

export async function updateCriterion(
  eventId: string,
  shareToken: string,
  criterionId: string,
  label: string
): Promise<MutationResult<EventState>> {
  const normalized = label.trim();
  if (codePointLength(normalized) < 1 || codePointLength(normalized) > CRITERION_LABEL_MAX_LENGTH) {
    return { data: null, error: "判断基準は1〜60文字で入力してください。" };
  }
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data
    .from("criteria")
    .update({ label: normalized })
    .eq("id", criterionId)
    .eq("event_id", eventId);
  if (error) return { data: null, error: "判断基準を変更できませんでした。" };
  return finish(eventId, shareToken);
}

export async function deleteCriterion(
  eventId: string,
  shareToken: string,
  criterionId: string
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const { error } = await supabase.data
    .from("criteria")
    .delete()
    .eq("id", criterionId)
    .eq("event_id", eventId);
  if (error) return { data: null, error: "判断基準を削除できませんでした。" };
  return finish(eventId, shareToken);
}

export async function setVote(
  eventId: string,
  shareToken: string,
  candidateId: string,
  participantId: string,
  value: VoteValue
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const existing = await supabase.data
    .from("votes")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("participant_id", participantId)
    .maybeSingle<{ id: string }>();
  if (existing.error) return { data: null, error: "総合評価を確認できませんでした。" };
  const { error } = existing.data
    ? await supabase.data.from("votes").update({ value }).eq("id", existing.data.id)
    : await supabase.data.from("votes").insert({
        candidate_id: candidateId,
        participant_id: participantId,
        value
      });
  if (error) return { data: null, error: "総合評価を保存できませんでした。" };
  return finish(eventId, shareToken);
}

async function setBinaryFeedback(
  table: "reactions" | "concerns",
  eventId: string,
  shareToken: string,
  candidateId: string,
  participantId: string,
  criterionId: string,
  enabled: boolean
): Promise<MutationResult<EventState>> {
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const query = enabled
    ? supabase.data.from(table).insert({
        candidate_id: candidateId,
        participant_id: participantId,
        criterion_id: criterionId
      })
    : supabase.data
        .from(table)
        .delete()
        .eq("candidate_id", candidateId)
        .eq("participant_id", participantId)
        .eq("criterion_id", criterionId);
  const { error } = await query;
  if (error) return { data: null, error: "反応を変更できませんでした。" };
  return finish(eventId, shareToken);
}

export function setReaction(
  eventId: string,
  shareToken: string,
  candidateId: string,
  participantId: string,
  criterionId: string,
  enabled: boolean
) {
  return setBinaryFeedback("reactions", eventId, shareToken, candidateId, participantId, criterionId, enabled);
}

export function setConcern(
  eventId: string,
  shareToken: string,
  candidateId: string,
  participantId: string,
  criterionId: string,
  enabled: boolean
) {
  return setBinaryFeedback("concerns", eventId, shareToken, candidateId, participantId, criterionId, enabled);
}

export async function saveComment(
  eventId: string,
  shareToken: string,
  candidateId: string,
  participantId: string,
  value: string
): Promise<MutationResult<EventState>> {
  const comment = value.trim();
  if (codePointLength(comment) > COMMENT_MAX_LENGTH) {
    return { data: null, error: "コメントは500文字以内で入力してください。" };
  }
  const supabase = configuredClient({ shareToken });
  if (!supabase.data) return { data: null, error: supabase.error };
  const existing = await supabase.data
    .from("comments")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("participant_id", participantId)
    .maybeSingle<{ id: string }>();
  if (existing.error) return { data: null, error: "コメントを確認できませんでした。" };
  const { error } = comment
    ? existing.data
      ? await supabase.data.from("comments").update({ text: comment }).eq("id", existing.data.id)
      : await supabase.data.from("comments").insert({
          candidate_id: candidateId,
          participant_id: participantId,
          text: comment
        })
    : existing.data
      ? await supabase.data.from("comments").delete().eq("id", existing.data.id)
      : { error: null };
  if (error) return { data: null, error: "コメントを保存できませんでした。" };
  return finish(eventId, shareToken);
}
