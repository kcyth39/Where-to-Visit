import { getGuestTokenCookie, setGuestTokenCookie } from "@/lib/cookies";
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

export type EventViewModel = {
  event: EventRecord;
  owner: ParticipantRecord | null;
  isOwner: boolean;
  candidates: CandidateRecord[];
  participants: ParticipantRecord[];
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

async function getEventRelations(
  eventId: string,
  tokens: SupabaseAccessTokens
): Promise<OperationResult<{
  candidates: CandidateRecord[];
  participants: ParticipantRecord[];
}>> {
  const supabase = getSupabaseServerClient(tokens);
  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const [candidateResult, participantResult] = await Promise.all([
    supabase.client
      .from("candidates")
      .select(CANDIDATE_SELECT_COLUMNS)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .returns<CandidateRecord[]>(),
    supabase.client
      .from("participants")
      .select(PARTICIPANT_SELECT_COLUMNS)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .returns<ParticipantRecord[]>()
  ]);

  if (candidateResult.error || participantResult.error) {
    return { data: null, error: "候補または参加者を取得できませんでした。" };
  }

  return {
    data: {
      candidates: candidateResult.data ?? [],
      participants: participantResult.data ?? []
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
      participants: relations.data.participants
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
  const tokens = { ownerToken };
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
