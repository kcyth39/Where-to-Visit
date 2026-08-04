import type { ClientConfig, QueryConfig, QueryResult } from "pg";

import type { CreateEventRouteResult } from "@/lib/event-types";
import { normalizeMemo } from "@/lib/memo";

export const EVENT_CREATOR_DATABASE_URL =
  "KIMENOSUKE_EVENT_CREATOR_DATABASE_URL";
export const EVENT_CREATOR_DATABASE_CA_PEM =
  "KIMENOSUKE_EVENT_CREATOR_DATABASE_CA_PEM";

export const EVENT_INSERT_SQL =
  "INSERT INTO public.events (title, memo, share_token) VALUES ($1, $2, $3)";

export const EVENT_CREATOR_TIMEOUTS = {
  connectionTimeoutMillis: 5000,
  lockTimeoutMillis: 1000,
  statementTimeoutMillis: 5000,
  queryTimeoutMillis: 7000,
  idleTransactionTimeoutMillis: 5000
} as const;

const QA_PROJECT_REF = "twcbycyyrxbovtgiqaun";
const PRODUCTION_PROJECT_REF = "ehmivhmsnhcrynvuahaq";
const APPLICATION_NAME = "kimenosuke-event-creator";

export type EventCreatorEnvironment =
  | "local"
  | "preview"
  | "production"
  | "unknown";

export type EventCreatorEnvironmentInputs = {
  nodeEnv?: string;
  vercelEnv?: string;
};

export type EventCreatorDatabaseInputs = EventCreatorEnvironmentInputs & {
  databaseUrl?: string;
  databaseCaPem?: string;
};

export type EventCreatorDatabaseResolution =
  | {
      status: "ready";
      environment: Exclude<EventCreatorEnvironment, "unknown">;
      clientConfig: ClientConfig;
    }
  | { status: "unavailable" };

export type EventInsertValues = {
  title: string;
  memo: string | null;
  shareToken: string;
};

export type EventInsertOutcome =
  | { status: "created" }
  | { status: "failed" }
  | { status: "outcome_unknown" };

export interface EventCreatorClient {
  connect(): Promise<unknown>;
  query(
    config: QueryConfig<[string, string | null, string]>
  ): Promise<Pick<QueryResult, "rowCount">>;
  end(): Promise<void>;
}

export type EventCreationDispatch = (
  values: EventInsertValues
) => Promise<EventInsertOutcome>;

function isExactCreateBody(
  value: unknown
): value is { title: string; memo?: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (
    keys.some((key) => key !== "title" && key !== "memo") ||
    !keys.includes("title")
  ) {
    return false;
  }
  const body = value as Record<string, unknown>;
  return (
    typeof body.title === "string" &&
    (body.memo === undefined ||
      body.memo === null ||
      typeof body.memo === "string")
  );
}

export async function resolveEventCreation(
  payload: unknown,
  dispatch: EventCreationDispatch,
  tokenFactory: () => string
): Promise<CreateEventRouteResult> {
  if (!isExactCreateBody(payload)) return { status: "failed" };

  const title = payload.title.trim();
  const titleLength = Array.from(title).length;
  if (titleLength < 1 || titleLength > 80) {
    return { status: "invalid", field: "title" };
  }

  const memo = normalizeMemo(payload.memo);
  if (memo.status === "invalid") {
    return { status: "invalid", field: "memo" };
  }

  const shareToken = tokenFactory();
  const outcome = await dispatch({
    title,
    memo: memo.status === "absent" ? null : memo.value,
    shareToken
  });
  return outcome.status === "created"
    ? { status: "created", path: `/e/${shareToken}?created=1` }
    : outcome;
}

export function classifyEventCreatorEnvironment({
  nodeEnv,
  vercelEnv
}: EventCreatorEnvironmentInputs): EventCreatorEnvironment {
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "production") return "production";
  if (vercelEnv !== undefined && vercelEnv !== "") return "unknown";
  if (nodeEnv === "development" || nodeEnv === "test") return "local";
  if (nodeEnv === "production") return "production";
  return "unknown";
}

function isPemCertificate(value: string): boolean {
  const header = "-----BEGIN CERTIFICATE-----\n";
  const footer = "\n-----END CERTIFICATE-----";
  return (
    value.startsWith(header) &&
    value.endsWith(footer) &&
    value.slice(header.length, -footer.length).trim().length > 0 &&
    !value.includes("\0")
  );
}

function normalizePemCertificate(value: string | undefined): string | null {
  if (value === undefined) return null;

  const normalized = value.trim();
  return isPemCertificate(normalized) ? normalized : null;
}

function parseDatabaseUrl(rawValue: string): URL | null {
  if (!rawValue || rawValue.trim() !== rawValue) return null;
  try {
    const parsed = new URL(rawValue);
    if (
      (parsed.protocol !== "postgres:" &&
        parsed.protocol !== "postgresql:") ||
      !parsed.username ||
      !parsed.password ||
      parsed.pathname !== "/postgres" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function decodeUrlComponent(rawValue: string): string | null {
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return null;
  }
}

function isHostedTarget(
  parsed: URL,
  projectRef: string
): boolean {
  return (
    parsed.hostname.endsWith(".pooler.supabase.com") &&
    parsed.port === "6543" &&
    decodeUrlComponent(parsed.username) ===
      `kimenosuke_event_creator.${projectRef}`
  );
}

export function resolveEventCreatorDatabase(
  inputs: EventCreatorDatabaseInputs
): EventCreatorDatabaseResolution {
  const environment = classifyEventCreatorEnvironment(inputs);
  if (environment === "unknown") return { status: "unavailable" };

  const parsed = inputs.databaseUrl
    ? parseDatabaseUrl(inputs.databaseUrl)
    : null;
  if (!parsed) return { status: "unavailable" };

  if (environment === "local") {
    if (
      inputs.databaseCaPem !== undefined ||
      parsed.hostname !== "127.0.0.1" ||
      parsed.port !== "54322" ||
      decodeUrlComponent(parsed.username) !== "kimenosuke_event_creator"
    ) {
      return { status: "unavailable" };
    }

    return {
      status: "ready",
      environment,
      clientConfig: {
        connectionString: inputs.databaseUrl,
        ssl: false,
        connectionTimeoutMillis:
          EVENT_CREATOR_TIMEOUTS.connectionTimeoutMillis,
        lock_timeout: EVENT_CREATOR_TIMEOUTS.lockTimeoutMillis,
        statement_timeout: EVENT_CREATOR_TIMEOUTS.statementTimeoutMillis,
        query_timeout: EVENT_CREATOR_TIMEOUTS.queryTimeoutMillis,
        idle_in_transaction_session_timeout:
          EVENT_CREATOR_TIMEOUTS.idleTransactionTimeoutMillis,
        application_name: APPLICATION_NAME,
        client_encoding: "UTF8"
      }
    };
  }

  const expectedProjectRef =
    environment === "preview" ? QA_PROJECT_REF : PRODUCTION_PROJECT_REF;
  const databaseCaPem = normalizePemCertificate(inputs.databaseCaPem);
  if (
    !isHostedTarget(parsed, expectedProjectRef) ||
    !databaseCaPem
  ) {
    return { status: "unavailable" };
  }

  return {
    status: "ready",
    environment,
    clientConfig: {
      connectionString: inputs.databaseUrl,
      ssl: {
        ca: databaseCaPem,
        rejectUnauthorized: true
      },
      connectionTimeoutMillis:
        EVENT_CREATOR_TIMEOUTS.connectionTimeoutMillis,
      lock_timeout: EVENT_CREATOR_TIMEOUTS.lockTimeoutMillis,
      statement_timeout: EVENT_CREATOR_TIMEOUTS.statementTimeoutMillis,
      query_timeout: EVENT_CREATOR_TIMEOUTS.queryTimeoutMillis,
      idle_in_transaction_session_timeout:
        EVENT_CREATOR_TIMEOUTS.idleTransactionTimeoutMillis,
      application_name: APPLICATION_NAME,
      client_encoding: "UTF8"
    }
  };
}

function hasDefinitiveSqlState(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  const code = String(error.code);
  return /^[0-9A-Z]{5}$/.test(code) && !code.startsWith("08");
}

export async function executeEventInsert(
  client: EventCreatorClient,
  values: EventInsertValues
): Promise<EventInsertOutcome> {
  let dispatched = false;

  try {
    await client.connect();
    dispatched = true;
    const result = await client.query({
      text: EVENT_INSERT_SQL,
      values: [values.title, values.memo, values.shareToken]
    });
    return result.rowCount === 1
      ? { status: "created" }
      : { status: "failed" };
  } catch (error) {
    if (dispatched && !hasDefinitiveSqlState(error)) {
      return { status: "outcome_unknown" };
    }
    return { status: "failed" };
  } finally {
    try {
      await client.end();
    } catch {
      // A completed query outcome is not changed by connection teardown.
    }
  }
}
