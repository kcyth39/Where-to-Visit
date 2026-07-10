import { getGuestTokenCookie, setGuestTokenCookie } from "@/lib/cookies";
import {
  COMMENT_MAX_LENGTH,
  CRITERION_LABEL_MAX_LENGTH,
  CRITERION_PRESETS,
  DEFAULT_CRITERION_LABEL
} from "@/lib/constants";
import {
  getSupabaseServerClient,
  type SupabaseAccessTokens
} from "@/lib/supabase";
import { createToken } from "@/lib/tokens";

const EVENT_SELECT_COLUMNS =
  "id,title,memo,owner_participant_id,share_token,created_at";
const PARTICIPANT_SELECT_COLUMNS =
  "id,event_id,display_name,created_at";
const CANDIDATE_SELECT_COLUMNS = "id,event_id,title,url,created_by,created_at";
const CRITERION_SELECT_COLUMNS =
  "id,event_id,label,source,created_by,created_at";
const REACTION_SELECT_COLUMNS =
  "id,candidate_id,participant_id,criterion_id,created_at";
const CONCERN_SELECT_COLUMNS = "id,candidate_id,participant_id,created_at";
const COMMENT_SELECT_COLUMNS =
  "id,candidate_id,participant_id,text,created_at";

export type EventRecord = {
  id: string;
  title: string;
  memo: string | null;
  owner_participant_id: string | null;
  share_token: string;
  created_at: string;
};

export type ParticipantRecord = {
  id: string;
  event_id: string;
  display_name: string | null;
  created_at: string;
};

export type CandidateRecord = {
  id: string;
  event_id: string;
  title: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
};

export type CriterionSource = "default" | "preset" | "custom";

export type CriterionRecord = {
  id: string;
  event_id: string;
  label: string;
  source: CriterionSource;
  created_by: string | null;
  created_at: string;
};

export type ReactionRecord = {
  id: string;
  candidate_id: string;
  participant_id: string;
  criterion_id: string;
  created_at: string;
};

export type ConcernRecord = {
  id: string;
  candidate_id: string;
  participant_id: string;
  created_at: string;
};

export type CommentRecord = {
  id: string;
  candidate_id: string;
  participant_id: string | null;
  text: string;
  created_at: string;
};

export type Slice5State = {
  criteria: CriterionRecord[];
  reactions: ReactionRecord[];
  concerns: ConcernRecord[];
  comments: CommentRecord[];
  participants: ParticipantRecord[];
  currentParticipantId: string | null;
};

export type EventViewModel = {
  event: EventRecord;
  owner: ParticipantRecord | null;
  isOwner: boolean;
  candidates: CandidateRecord[];
  participants: ParticipantRecord[];
  slice5: Slice5State;
};

export type OperationResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
  return normalizeText(value) || null;
}

export function parseEventInput(formData: FormData): OperationResult<{
  title: string;
  memo: string | null;
  ownerName: string | null;
}> {
  const title = normalizeText(formData.get("title"));
  const memo = normalizeOptionalText(formData.get("memo"));
  const ownerName = normalizeOptionalText(formData.get("ownerName"));

  if (!title) {
    return { data: null, error: "お題を入力してください。" };
  }

  return {
    data: { title, memo, ownerName },
    error: null
  };
}

export async function createEventWithOwner(formData: FormData): Promise<
  OperationResult<{ shareToken: string; ownerToken: string }>
> {
  const input = parseEventInput(formData);

  if (!input.data) {
    return { data: null, error: input.error };
  }

  const shareToken = createToken();
  const ownerToken = createToken();
  const guestToken = createToken();
  const supabase = getSupabaseServerClient({ shareToken, ownerToken, guestToken });

  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const { data: event, error: eventError } = await supabase.client
    .from("events")
    .insert({
      title: input.data.title,
      memo: input.data.memo,
      share_token: shareToken,
      owner_token: ownerToken
    })
    .select(EVENT_SELECT_COLUMNS)
    .single<EventRecord>();

  if (eventError || !event) {
    return {
      data: null,
      error: "イベントを作成できませんでした。Supabase のテーブル状態を確認してください。"
    };
  }

  const { data: participant, error: participantError } = await supabase.client
    .from("participants")
    .insert({
      event_id: event.id,
      display_name: input.data.ownerName,
      guest_token: guestToken
    })
    .select(PARTICIPANT_SELECT_COLUMNS)
    .single<ParticipantRecord>();

  if (participantError || !participant) {
    return {
      data: null,
      error: "作成者を記録できませんでした。Supabase のテーブル状態を確認してください。"
    };
  }

  const { error: updateError } = await supabase.client
    .from("events")
    .update({ owner_participant_id: participant.id })
    .eq("id", event.id);

  if (updateError) {
    return { data: null, error: "オーナー情報をイベントへ紐づけできませんでした。" };
  }

  const { error: criterionError } = await supabase.client.from("criteria").insert({
    event_id: event.id,
    label: DEFAULT_CRITERION_LABEL,
    source: "default"
  });

  if (criterionError) {
    return { data: null, error: "判断基準を作成できませんでした。" };
  }

  await setGuestTokenCookie(guestToken);
  return { data: { shareToken, ownerToken }, error: null };
}

async function getOwnerParticipant(
  event: EventRecord,
  tokens: SupabaseAccessTokens
): Promise<OperationResult<ParticipantRecord | null>> {
  if (!event.owner_participant_id) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const { data, error } = await supabase.client
    .from("participants")
    .select(PARTICIPANT_SELECT_COLUMNS)
    .eq("id", event.owner_participant_id)
    .maybeSingle<ParticipantRecord>();

  if (error) {
    return { data: null, error: "オーナー情報を取得できませんでした。" };
  }

  return { data: data ?? null, error: null };
}

async function loadSlice5State(
  eventId: string,
  tokens: SupabaseAccessTokens
): Promise<OperationResult<Slice5State>> {
  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const [candidateResult, participantResult, criterionResult, currentParticipantResult] =
    await Promise.all([
      supabase.client
        .from("candidates")
        .select("id")
        .eq("event_id", eventId)
        .returns<Array<{ id: string }>>(),
      supabase.client
        .from("participants")
        .select(PARTICIPANT_SELECT_COLUMNS)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .returns<ParticipantRecord[]>(),
      supabase.client
        .from("criteria")
        .select(CRITERION_SELECT_COLUMNS)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .returns<CriterionRecord[]>(),
      supabase.client.rpc("request_guest_participant_id", {
        target_event_id: eventId
      })
    ]);

  if (
    candidateResult.error ||
    participantResult.error ||
    criterionResult.error ||
    currentParticipantResult.error
  ) {
    return { data: null, error: "判断基準または参加者情報を取得できませんでした。" };
  }

  const candidateIds = (candidateResult.data ?? []).map((candidate) => candidate.id);
  let reactions: ReactionRecord[] = [];
  let concerns: ConcernRecord[] = [];
  let comments: CommentRecord[] = [];

  if (candidateIds.length > 0) {
    const [reactionResult, concernResult, commentResult] = await Promise.all([
      supabase.client
        .from("reactions")
        .select(REACTION_SELECT_COLUMNS)
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .returns<ReactionRecord[]>(),
      supabase.client
        .from("concerns")
        .select(CONCERN_SELECT_COLUMNS)
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .returns<ConcernRecord[]>(),
      supabase.client
        .from("comments")
        .select(COMMENT_SELECT_COLUMNS)
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .returns<CommentRecord[]>()
    ]);

    if (reactionResult.error || concernResult.error || commentResult.error) {
      return { data: null, error: "候補への反応またはコメントを取得できませんでした。" };
    }

    reactions = reactionResult.data ?? [];
    concerns = concernResult.data ?? [];
    comments = commentResult.data ?? [];
  }

  return {
    data: {
      criteria: criterionResult.data ?? [],
      reactions,
      concerns,
      comments,
      participants: participantResult.data ?? [],
      currentParticipantId:
        typeof currentParticipantResult.data === "string"
          ? currentParticipantResult.data
          : null
    },
    error: null
  };
}

async function getEventRelations(
  eventId: string,
  tokens: SupabaseAccessTokens
): Promise<OperationResult<{
  candidates: CandidateRecord[];
  slice5: Slice5State;
}>> {
  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const [candidateResult, slice5Result] = await Promise.all([
    supabase.client
      .from("candidates")
      .select(CANDIDATE_SELECT_COLUMNS)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<CandidateRecord[]>(),
    loadSlice5State(eventId, tokens)
  ]);

  if (candidateResult.error || !slice5Result.data) {
    return {
      data: null,
      error: candidateResult.error
        ? "候補を取得できませんでした。"
        : (slice5Result.error ?? "判断基準を取得できませんでした。")
    };
  }

  return {
    data: {
      candidates: candidateResult.data ?? [],
      slice5: slice5Result.data
    },
    error: null
  };
}

async function buildEventView(
  event: EventRecord,
  tokens: SupabaseAccessTokens,
  isOwner: boolean
): Promise<OperationResult<EventViewModel>> {
  const [owner, relations] = await Promise.all([
    getOwnerParticipant(event, tokens),
    getEventRelations(event.id, tokens)
  ]);

  if (owner.error) {
    return { data: null, error: owner.error };
  }
  if (!relations.data) {
    return { data: null, error: relations.error };
  }

  return {
    data: {
      event,
      owner: owner.data,
      isOwner,
      candidates: relations.data.candidates,
      participants: relations.data.slice5.participants,
      slice5: relations.data.slice5
    },
    error: null
  };
}

export async function getEventByShareToken(
  shareToken: string
): Promise<OperationResult<EventViewModel>> {
  const guestToken = await getGuestTokenCookie();
  const tokens = { shareToken, guestToken };
  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const { data: event, error } = await supabase.client
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("share_token", shareToken)
    .maybeSingle<EventRecord>();

  if (error) {
    return { data: null, error: "イベントを取得できませんでした。" };
  }
  if (!event) {
    return { data: null, error: "イベントが見つかりません。" };
  }

  const { data: isOwner, error: ownerCheckError } = await supabase.client.rpc(
    "request_guest_owns_event",
    { target_event_id: event.id }
  );
  if (ownerCheckError) {
    return { data: null, error: "オーナー権限を確認できませんでした。" };
  }

  return buildEventView(event, tokens, Boolean(isOwner));
}

export async function getEventByOwnerToken(
  ownerToken: string
): Promise<OperationResult<EventViewModel>> {
  const guestToken = await getGuestTokenCookie();
  const tokens = { ownerToken, guestToken };
  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const { data: event, error } = await supabase.client
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .limit(1)
    .maybeSingle<EventRecord>();

  if (error) {
    return { data: null, error: "イベントを取得できませんでした。" };
  }
  if (!event) {
    return { data: null, error: "イベントが見つかりません。" };
  }

  return buildEventView(event, tokens, true);
}

export async function claimOwnerSession(
  ownerToken: string
): Promise<OperationResult<{ shareToken: string }>> {
  const event = await getEventByOwnerToken(ownerToken);
  if (!event.data) {
    return { data: null, error: event.error };
  }
  const supabase = getSupabaseServerClient({ ownerToken });
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }
  const { data: guestToken, error } = await supabase.client.rpc(
    "owner_guest_token_for_request",
    { target_event_id: event.data.event.id }
  );
  if (error || !guestToken) {
    return { data: null, error: "オーナー情報を確認できませんでした。" };
  }

  await setGuestTokenCookie(guestToken);
  return { data: { shareToken: event.data.event.share_token }, error: null };
}

export async function updateEventFromForm(
  formData: FormData
): Promise<OperationResult<{ shareToken: string }>> {
  const eventId = normalizeText(formData.get("eventId"));
  const ownerToken = normalizeText(formData.get("ownerToken"));
  const title = normalizeText(formData.get("title"));
  const memo = normalizeOptionalText(formData.get("memo"));
  const guestToken = await getGuestTokenCookie();

  if (!eventId) return { data: null, error: "イベントを特定できません。" };
  if (!title) return { data: null, error: "お題を入力してください。" };

  const tokens = { ownerToken: ownerToken || undefined, guestToken };
  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) return { data: null, error: supabase.configError };

  const { data: event, error: eventError } = await supabase.client
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle<EventRecord>();
  if (eventError) return { data: null, error: "イベントを取得できませんでした。" };
  if (!event) return { data: null, error: "イベントが見つかりません。" };

  const [ownerTokenResult, ownerGuestResult] = await Promise.all([
    supabase.client.rpc("request_owner_token_matches_event", {
      target_event_id: event.id
    }),
    supabase.client.rpc("request_guest_owns_event", {
      target_event_id: event.id
    })
  ]);
  if (ownerTokenResult.error || ownerGuestResult.error) {
    return { data: null, error: "オーナー権限を確認できませんでした。" };
  }
  const canEdit = Boolean(ownerTokenResult.data || ownerGuestResult.data);
  if (!canEdit) return { data: null, error: "オーナー権限を確認できませんでした。" };

  const { error: updateError } = await supabase.client
    .from("events")
    .update({ title, memo })
    .eq("id", event.id);
  if (updateError) return { data: null, error: "イベントを更新できませんでした。" };

  return { data: { shareToken: event.share_token }, error: null };
}

function parseCandidateContext(formData: FormData): OperationResult<{
  eventId: string;
  shareToken: string;
  guestToken: string;
}> {
  const eventId = normalizeText(formData.get("eventId"));
  const shareToken = normalizeText(formData.get("shareToken"));

  if (!eventId || !shareToken) {
    return { data: null, error: "候補を操作するための情報が不足しています。" };
  }

  return { data: { eventId, shareToken, guestToken: "" }, error: null };
}

async function getCandidateClient(formData: FormData): Promise<
  OperationResult<{
    eventId: string;
    shareToken: string;
    guestToken: string;
    client: NonNullable<ReturnType<typeof getSupabaseServerClient>["client"]>;
  }>
> {
  const context = parseCandidateContext(formData);
  if (!context.data) return context;

  const guestToken = await getGuestTokenCookie();
  if (!guestToken) {
    return { data: null, error: "参加者を識別できません。ページを再読み込みしてください。" };
  }

  const supabase = getSupabaseServerClient({
    shareToken: context.data.shareToken,
    guestToken
  });
  if (!supabase.client) return { data: null, error: supabase.configError };

  return {
    data: { ...context.data, guestToken, client: supabase.client },
    error: null
  };
}

async function ensureParticipant(
  eventId: string,
  guestToken: string,
  displayName: string | null,
  client: NonNullable<ReturnType<typeof getSupabaseServerClient>["client"]>
): Promise<OperationResult<{ id: string }>> {
  const { data: participantId, error: participantError } = await client.rpc(
    "request_guest_participant_id",
    { target_event_id: eventId }
  );
  if (participantError) return { data: null, error: "参加者を取得できませんでした。" };

  if (participantId) {
    if (!displayName) return { data: { id: participantId }, error: null };
    const { data, error } = await client
      .from("participants")
      .update({ display_name: displayName })
      .eq("id", participantId)
      .select(PARTICIPANT_SELECT_COLUMNS)
      .single<ParticipantRecord>();
    if (error || !data) return { data: null, error: "お名前を更新できませんでした。" };
    return { data: { id: data.id }, error: null };
  }

  const { data, error } = await client
    .from("participants")
    .insert({ event_id: eventId, guest_token: guestToken, display_name: displayName })
    .select(PARTICIPANT_SELECT_COLUMNS)
    .single<ParticipantRecord>();
  if (error || !data) return { data: null, error: "参加者を記録できませんでした。" };
  return { data: { id: data.id }, error: null };
}

export async function createCandidateFromForm(
  formData: FormData
): Promise<OperationResult<undefined>> {
  const context = await getCandidateClient(formData);
  if (!context.data) return { data: null, error: context.error };

  const title = normalizeOptionalText(formData.get("title"));
  const url = normalizeOptionalText(formData.get("url"));
  const displayName = normalizeOptionalText(formData.get("displayName"));
  if (!title && !url) return { data: null, error: "タイトルかリンクのどちらかを入力してください。" };

  const participant = await ensureParticipant(
    context.data.eventId,
    context.data.guestToken,
    displayName,
    context.data.client
  );
  if (!participant.data) return { data: null, error: participant.error };

  const { error } = await context.data.client.from("candidates").insert({
    event_id: context.data.eventId,
    title,
    url,
    created_by: participant.data.id
  });
  if (error) return { data: null, error: "候補を追加できませんでした。" };

  return { data: undefined, error: null };
}

async function getCandidateForUpdate(
  formData: FormData
): Promise<
  OperationResult<{
    candidate: CandidateRecord;
    client: NonNullable<ReturnType<typeof getSupabaseServerClient>["client"]>;
  }>
> {
  const context = await getCandidateClient(formData);
  if (!context.data) return { data: null, error: context.error };
  const candidateId = normalizeText(formData.get("candidateId"));
  if (!candidateId) return { data: null, error: "候補を特定できません。" };

  const { data, error } = await context.data.client
    .from("candidates")
    .select(CANDIDATE_SELECT_COLUMNS)
    .eq("id", candidateId)
    .eq("event_id", context.data.eventId)
    .maybeSingle<CandidateRecord>();
  if (error) return { data: null, error: "候補を取得できませんでした。" };
  if (!data) return { data: null, error: "候補が見つかりません。" };

  return { data: { candidate: data, client: context.data.client }, error: null };
}

export async function updateCandidateFieldFromForm(
  formData: FormData
): Promise<OperationResult<undefined>> {
  const field = normalizeText(formData.get("field"));
  if (field !== "title" && field !== "url") {
    return { data: null, error: "変更する項目を特定できません。" };
  }

  const context = await getCandidateForUpdate(formData);
  if (!context.data) return { data: null, error: context.error };
  const value = normalizeOptionalText(formData.get("value"));
  const title = field === "title" ? value : context.data.candidate.title;
  const url = field === "url" ? value : context.data.candidate.url;
  if (!title && !url) return { data: null, error: "タイトルかリンクのどちらかを残してください。" };

  const { error } = await context.data.client
    .from("candidates")
    .update({ [field]: value })
    .eq("id", context.data.candidate.id);
  if (error) return { data: null, error: "候補を変更できませんでした。" };
  return { data: undefined, error: null };
}

export async function updateCandidateProposerFromForm(
  formData: FormData
): Promise<OperationResult<undefined>> {
  const context = await getCandidateForUpdate(formData);
  if (!context.data) return { data: null, error: context.error };
  const createdBy = normalizeOptionalText(formData.get("createdBy"));

  const { error } = await context.data.client
    .from("candidates")
    .update({ created_by: createdBy })
    .eq("id", context.data.candidate.id);
  if (error) return { data: null, error: "提案者を変更できませんでした。" };
  return { data: undefined, error: null };
}

export async function deleteCandidateFromForm(
  formData: FormData
): Promise<OperationResult<undefined>> {
  const context = await getCandidateForUpdate(formData);
  if (!context.data) return { data: null, error: context.error };
  const { error } = await context.data.client
    .from("candidates")
    .delete()
    .eq("id", context.data.candidate.id);
  if (error) return { data: null, error: "候補を削除できませんでした。" };
  return { data: undefined, error: null };
}

type Slice5ClientContext = {
  eventId: string;
  shareToken: string;
  guestToken: string | undefined;
  client: NonNullable<ReturnType<typeof getSupabaseServerClient>["client"]>;
};

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function isCriterionPreset(value: string): boolean {
  return (CRITERION_PRESETS as readonly string[]).includes(value);
}

async function getSlice5Client(
  formData: FormData
): Promise<OperationResult<Slice5ClientContext>> {
  const eventId = normalizeText(formData.get("eventId"));
  const shareToken = normalizeText(formData.get("shareToken"));

  if (!eventId || !shareToken) {
    return { data: null, error: "操作するための情報が不足しています。" };
  }

  const guestToken = await getGuestTokenCookie();
  const supabase = getSupabaseServerClient({ shareToken, guestToken });
  if (!supabase.client) return { data: null, error: supabase.configError };

  const { data: event, error } = await supabase.client
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle<{ id: string }>();

  if (error) return { data: null, error: "イベントを確認できませんでした。" };
  if (!event) return { data: null, error: "イベントが見つかりません。" };

  return {
    data: { eventId, shareToken, guestToken, client: supabase.client },
    error: null
  };
}

async function getCurrentSlice5Participant(
  context: Slice5ClientContext
): Promise<OperationResult<{ id: string }>> {
  if (!context.guestToken) {
    return { data: null, error: "参加者を識別できません。ページを再読み込みしてください。" };
  }

  return ensureParticipant(
    context.eventId,
    context.guestToken,
    null,
    context.client
  );
}

async function finishSlice5Mutation(
  context: Slice5ClientContext
): Promise<OperationResult<Slice5State>> {
  return loadSlice5State(context.eventId, {
    shareToken: context.shareToken,
    guestToken: context.guestToken
  });
}

export async function refreshSlice5StateFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };
  return finishSlice5Mutation(context.data);
}

export async function createCriterionFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const label = normalizeText(formData.get("label"));
  const source = normalizeText(formData.get("source"));
  if (codePointLength(label) < 1 || codePointLength(label) > CRITERION_LABEL_MAX_LENGTH) {
    return { data: null, error: "判断基準は1〜60文字で入力してください。" };
  }
  if (source !== "custom" && source !== "preset") {
    return { data: null, error: "判断基準の追加方法を確認できませんでした。" };
  }
  if (source === "preset" && !isCriterionPreset(label)) {
    return { data: null, error: "判断基準の選択肢を確認できませんでした。" };
  }

  const { error } = await context.data.client.from("criteria").insert({
    event_id: context.data.eventId,
    label,
    source
  });
  if (error) return { data: null, error: "判断基準を追加できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function updateCriterionFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const criterionId = normalizeText(formData.get("criterionId"));
  const label = normalizeText(formData.get("label"));
  if (!criterionId) return { data: null, error: "判断基準を特定できません。" };
  if (codePointLength(label) < 1 || codePointLength(label) > CRITERION_LABEL_MAX_LENGTH) {
    return { data: null, error: "判断基準は1〜60文字で入力してください。" };
  }

  const { data, error } = await context.data.client
    .from("criteria")
    .update({ label })
    .eq("id", criterionId)
    .eq("event_id", context.data.eventId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { data: null, error: "判断基準を変更できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function deleteCriterionFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const criterionId = normalizeText(formData.get("criterionId"));
  if (!criterionId) return { data: null, error: "判断基準を特定できません。" };

  const { data, error } = await context.data.client
    .from("criteria")
    .delete()
    .eq("id", criterionId)
    .eq("event_id", context.data.eventId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { data: null, error: "判断基準を削除できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function toggleReactionFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const candidateId = normalizeText(formData.get("candidateId"));
  const criterionId = normalizeText(formData.get("criterionId"));
  if (!candidateId || !criterionId) {
    return { data: null, error: "❤️を操作する対象を確認できませんでした。" };
  }

  const participant = await getCurrentSlice5Participant(context.data);
  if (!participant.data) return { data: null, error: participant.error };

  const { data: existing, error: findError } = await context.data.client
    .from("reactions")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("criterion_id", criterionId)
    .eq("participant_id", participant.data.id)
    .maybeSingle<{ id: string }>();
  if (findError) return { data: null, error: "❤️の状態を確認できませんでした。" };

  const mutation = existing
    ? context.data.client.from("reactions").delete().eq("id", existing.id)
    : context.data.client.from("reactions").insert({
        candidate_id: candidateId,
        criterion_id: criterionId,
        participant_id: participant.data.id
      });
  const { error } = await mutation;
  if (error) return { data: null, error: "❤️を変更できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function removeReactionFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const reactionId = normalizeText(formData.get("reactionId"));
  if (!reactionId) return { data: null, error: "❤️を特定できません。" };

  const { data, error } = await context.data.client
    .from("reactions")
    .delete()
    .eq("id", reactionId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { data: null, error: "❤️を外せませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function toggleConcernFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const candidateId = normalizeText(formData.get("candidateId"));
  if (!candidateId) return { data: null, error: "🌀を操作する候補を確認できませんでした。" };

  const participant = await getCurrentSlice5Participant(context.data);
  if (!participant.data) return { data: null, error: participant.error };

  const { data: existing, error: findError } = await context.data.client
    .from("concerns")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("participant_id", participant.data.id)
    .maybeSingle<{ id: string }>();
  if (findError) return { data: null, error: "🌀の状態を確認できませんでした。" };

  const mutation = existing
    ? context.data.client.from("concerns").delete().eq("id", existing.id)
    : context.data.client.from("concerns").insert({
        candidate_id: candidateId,
        participant_id: participant.data.id
      });
  const { error } = await mutation;
  if (error) return { data: null, error: "🌀を変更できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function removeConcernFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const concernId = normalizeText(formData.get("concernId"));
  if (!concernId) return { data: null, error: "🌀を特定できません。" };

  const { data, error } = await context.data.client
    .from("concerns")
    .delete()
    .eq("id", concernId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { data: null, error: "🌀を外せませんでした。" };

  return finishSlice5Mutation(context.data);
}

function parseCommentText(formData: FormData): OperationResult<string> {
  const text = normalizeText(formData.get("text"));
  const length = codePointLength(text);
  if (length < 1 || length > COMMENT_MAX_LENGTH) {
    return { data: null, error: "コメントは1〜500文字で入力してください。" };
  }
  return { data: text, error: null };
}

export async function createCommentFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };
  const comment = parseCommentText(formData);
  if (comment.data === null) return { data: null, error: comment.error };

  const candidateId = normalizeText(formData.get("candidateId"));
  if (!candidateId) return { data: null, error: "コメントする候補を確認できませんでした。" };

  const participant = await getCurrentSlice5Participant(context.data);
  if (!participant.data) return { data: null, error: participant.error };

  const { error } = await context.data.client.from("comments").insert({
    candidate_id: candidateId,
    participant_id: participant.data.id,
    text: comment.data
  });
  if (error) return { data: null, error: "コメントを投稿できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function updateCommentFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };
  const comment = parseCommentText(formData);
  if (comment.data === null) return { data: null, error: comment.error };

  const commentId = normalizeText(formData.get("commentId"));
  if (!commentId) return { data: null, error: "コメントを特定できません。" };

  const { data, error } = await context.data.client
    .from("comments")
    .update({ text: comment.data })
    .eq("id", commentId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { data: null, error: "コメントを変更できませんでした。" };

  return finishSlice5Mutation(context.data);
}

export async function deleteCommentFromForm(
  formData: FormData
): Promise<OperationResult<Slice5State>> {
  const context = await getSlice5Client(formData);
  if (!context.data) return { data: null, error: context.error };

  const commentId = normalizeText(formData.get("commentId"));
  if (!commentId) return { data: null, error: "コメントを特定できません。" };

  const { data, error } = await context.data.client
    .from("comments")
    .delete()
    .eq("id", commentId)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { data: null, error: "コメントを削除できませんでした。" };

  return finishSlice5Mutation(context.data);
}
