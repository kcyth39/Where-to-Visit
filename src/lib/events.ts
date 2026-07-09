import { EVENT_ATTRIBUTES, type EventAttribute } from "@/lib/constants";
import { getGuestTokenCookie, setGuestTokenCookie } from "@/lib/cookies";
import {
  getSupabaseServerClient,
  type SupabaseAccessTokens
} from "@/lib/supabase";
import { createToken } from "@/lib/tokens";

const EVENT_SELECT_COLUMNS =
  "id,title,memo,attribute,owner_participant_id,share_token,created_at";

const PARTICIPANT_SELECT_COLUMNS =
  "id,event_id,display_name,guest_token,created_at";

export type EventRecord = {
  id: string;
  title: string;
  memo: string | null;
  attribute: EventAttribute;
  owner_participant_id: string | null;
  share_token: string;
  created_at: string;
};

export type ParticipantRecord = {
  id: string;
  event_id: string;
  display_name: string;
  guest_token: string;
  created_at: string;
};

export type EventViewModel = {
  event: EventRecord;
  owner: ParticipantRecord | null;
  isOwner: boolean;
};

export type OperationResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

function normalizeText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseEventInput(formData: FormData): OperationResult<{
  title: string;
  memo: string | null;
  attribute: EventAttribute;
  ownerName: string;
}> {
  const title = normalizeText(formData.get("title"));
  const memo = normalizeText(formData.get("memo"));
  const ownerName = normalizeText(formData.get("ownerName"));
  const attribute = normalizeText(formData.get("attribute"));
  const validAttribute = EVENT_ATTRIBUTES.some((item) => item.value === attribute);

  if (!title) {
    return { data: null, error: "お題を入力してください。" };
  }

  if (!ownerName) {
    return { data: null, error: "おなまえを入力してください。" };
  }

  if (!validAttribute) {
    return { data: null, error: "どんなこと？をえらんでください。" };
  }

  return {
    data: {
      title,
      memo: memo || null,
      ownerName,
      attribute: attribute as EventAttribute
    },
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

  const inputData = input.data;
  const shareToken = createToken();
  const ownerToken = createToken();
  const guestToken = createToken();
  const supabase = getSupabaseServerClient({
    shareToken,
    ownerToken,
    guestToken
  });

  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const client = supabase.client;

  const { data: event, error: eventError } = await client
    .from("events")
    .insert({
      title: inputData.title,
      memo: inputData.memo,
      attribute: inputData.attribute,
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

  const { data: participant, error: participantError } = await client
    .from("participants")
    .insert({
      event_id: event.id,
      display_name: inputData.ownerName,
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

  const { error: updateError } = await client
    .from("events")
    .update({ owner_participant_id: participant.id })
    .eq("id", event.id);

  if (updateError) {
    return {
      data: null,
      error: "オーナー情報をイベントへ紐づけできませんでした。"
    };
  }

  await setGuestTokenCookie(guestToken);

  return {
    data: {
      shareToken,
      ownerToken
    },
    error: null
  };
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

  const client = supabase.client;
  const { data, error } = await client
    .from("participants")
    .select(PARTICIPANT_SELECT_COLUMNS)
    .eq("id", event.owner_participant_id)
    .maybeSingle<ParticipantRecord>();

  if (error) {
    return { data: null, error: "オーナー情報を取得できませんでした。" };
  }

  return { data: data ?? null, error: null };
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

  const client = supabase.client;
  const { data: event, error } = await client
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

  const owner = await getOwnerParticipant(event, tokens);

  if (owner.error) {
    return { data: null, error: owner.error };
  }

  const isOwner = Boolean(
    guestToken && owner.data && guestToken === owner.data.guest_token
  );

  return {
    data: {
      event,
      owner: owner.data,
      isOwner
    },
    error: null
  };
}

export async function getEventByOwnerToken(
  ownerToken: string
): Promise<OperationResult<EventViewModel>> {
  const tokens = { ownerToken };
  const supabase = getSupabaseServerClient(tokens);

  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const client = supabase.client;
  const { data: event, error } = await client
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

  const owner = await getOwnerParticipant(event, tokens);

  if (owner.error) {
    return { data: null, error: owner.error };
  }

  return {
    data: {
      event,
      owner: owner.data,
      isOwner: true
    },
    error: null
  };
}

export async function claimOwnerSession(
  ownerToken: string
): Promise<OperationResult<{ shareToken: string }>> {
  const event = await getEventByOwnerToken(ownerToken);

  if (!event.data) {
    return { data: null, error: event.error };
  }

  const eventData = event.data;

  if (!eventData.owner) {
    return { data: null, error: "オーナー情報が見つかりません。" };
  }

  await setGuestTokenCookie(eventData.owner.guest_token);

  return {
    data: {
      shareToken: eventData.event.share_token
    },
    error: null
  };
}

export async function updateEventFromForm(
  formData: FormData
): Promise<OperationResult<{ shareToken: string }>> {
  const eventId = normalizeText(formData.get("eventId"));
  const ownerToken = normalizeText(formData.get("ownerToken"));
  const title = normalizeText(formData.get("title"));
  const memoValue = normalizeText(formData.get("memo"));
  const guestToken = await getGuestTokenCookie();

  if (!eventId) {
    return { data: null, error: "イベントを特定できません。" };
  }

  if (!title) {
    return { data: null, error: "お題を入力してください。" };
  }

  const tokens = {
    ownerToken: ownerToken || undefined,
    guestToken
  };
  const supabase = getSupabaseServerClient(tokens);

  if (!supabase.client) {
    return { data: null, error: supabase.configError };
  }

  const client = supabase.client;
  const { data: event, error: eventError } = await client
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle<EventRecord>();

  if (eventError) {
    return { data: null, error: "イベントを取得できませんでした。" };
  }

  if (!event) {
    return { data: null, error: "イベントが見つかりません。" };
  }

  const owner = await getOwnerParticipant(event, tokens);

  if (owner.error) {
    return { data: null, error: owner.error };
  }

  const canEdit = Boolean(
    ownerToken || (guestToken && owner.data && guestToken === owner.data.guest_token)
  );

  if (!canEdit) {
    return { data: null, error: "オーナー権限を確認できませんでした。" };
  }

  const { error: updateError } = await client
    .from("events")
    .update({
      title,
      memo: memoValue || null
    })
    .eq("id", event.id);

  if (updateError) {
    return { data: null, error: "イベントを更新できませんでした。" };
  }

  return {
    data: {
      shareToken: event.share_token
    },
    error: null
  };
}
