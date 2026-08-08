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
  supabaseTarget?: string;
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

export type EventCreatorDiagnosticCategory =
  | "creator_request_invalid"
  | "creator_config_invalid"
  | "creator_tls_failed"
  | "creator_auth_failed"
  | "creator_connect_failed"
  | "creator_sql_failed"
  | "creator_result_invalid"
  | "creator_outcome_unknown";

export type EventCreatorDiagnosticPhase =
  | "request"
  | "config"
  | "connect"
  | "query";

export type EventCreatorDiagnostic = {
  event: "event_creator_failure";
  version: 1;
  phase: EventCreatorDiagnosticPhase;
  category: EventCreatorDiagnosticCategory;
  sqlstate?: string;
};

export type EventCreatorDiagnosticSink = (
  diagnostic: EventCreatorDiagnostic
) => void;

const TLS_ERROR_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "ERR_TLS_CERT_SIGNATURE_ALGORITHM_UNSUPPORTED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
]);

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

export function emitEventCreatorDiagnostic(
  diagnostic: EventCreatorDiagnostic
): void {
  try {
    console.warn(JSON.stringify(diagnostic));
  } catch {
    // Diagnostic logging must never change the response or database outcome.
  }
}

export function safeEmitEventCreatorDiagnostic(
  sink: EventCreatorDiagnosticSink,
  diagnostic: EventCreatorDiagnostic
): void {
  try {
    sink(diagnostic);
  } catch {
    // A failing diagnostic sink must not change the response or outcome.
  }
}

function safeSqlState(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  const code = error.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)
    ? code
    : undefined;
}

function classifyConnectFailure(
  error: unknown
): Pick<EventCreatorDiagnostic, "category" | "sqlstate"> {
  const sqlstate = safeSqlState(error);
  if (sqlstate?.startsWith("28")) {
    return { category: "creator_auth_failed", sqlstate };
  }

  const errorCode =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  if (typeof errorCode === "string" && TLS_ERROR_CODES.has(errorCode)) {
    return { category: "creator_tls_failed" };
  }

  return { category: "creator_connect_failed" };
}

function classifyQueryFailure(
  error: unknown
): Pick<EventCreatorDiagnostic, "category" | "sqlstate"> {
  const sqlstate = safeSqlState(error);
  if (sqlstate?.startsWith("28")) {
    return { category: "creator_auth_failed", sqlstate };
  }
  if (hasDefinitiveSqlState(error)) {
    return { category: "creator_sql_failed", sqlstate };
  }
  return {
    category: "creator_outcome_unknown",
    ...(sqlstate ? { sqlstate } : {})
  };
}

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
  tokenFactory: () => string,
  diagnosticSink: EventCreatorDiagnosticSink = emitEventCreatorDiagnostic
): Promise<CreateEventRouteResult> {
  if (!isExactCreateBody(payload)) {
    safeEmitEventCreatorDiagnostic(diagnosticSink, {
      event: "event_creator_failure",
      version: 1,
      phase: "request",
      category: "creator_request_invalid"
    });
    return { status: "failed" };
  }

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
  if (
    inputs.supabaseTarget !== undefined &&
    !["local", "n9-stage1", "qa"].includes(inputs.supabaseTarget)
  ) {
    return { status: "unavailable" };
  }

  if (inputs.supabaseTarget === "local") {
    if (
      (inputs.nodeEnv !== "development" && inputs.nodeEnv !== "test") ||
      (inputs.vercelEnv !== undefined && inputs.vercelEnv !== "")
    ) {
      return { status: "unavailable" };
    }
    const parsed = inputs.databaseUrl
      ? parseDatabaseUrl(inputs.databaseUrl)
      : null;
    if (
      !parsed ||
      inputs.databaseCaPem !== undefined ||
      parsed.hostname !== "127.0.0.1" ||
      parsed.port !== "54322" ||
      decodeUrlComponent(parsed.username) !== "kimenosuke_event_creator"
    ) {
      return { status: "unavailable" };
    }
    return {
      status: "ready",
      environment: "local",
      clientConfig: {
        connectionString: inputs.databaseUrl!,
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

  if (inputs.supabaseTarget === "n9-stage1") {
    if (
      (inputs.nodeEnv !== "development" && inputs.nodeEnv !== "test") ||
      (inputs.vercelEnv !== undefined && inputs.vercelEnv !== "")
    ) {
      return { status: "unavailable" };
    }
    const parsed = inputs.databaseUrl
      ? parseDatabaseUrl(inputs.databaseUrl)
      : null;
    let username = null;
    try {
      username = parsed ? decodeUrlComponent(parsed.username) : null;
    } catch {
      username = null;
    }
    if (
      !parsed ||
      inputs.databaseCaPem !== "" ||
      parsed.hostname !== "127.0.0.1" ||
      parsed.port !== "55322" ||
      username !== "kimenosuke_event_creator"
    ) {
      return { status: "unavailable" };
    }
    return {
      status: "ready",
      environment: "local",
      clientConfig: {
        connectionString: inputs.databaseUrl!,
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

  if (inputs.supabaseTarget === "qa") {
    if (
      (inputs.nodeEnv !== "development" && inputs.nodeEnv !== "test") ||
      (inputs.vercelEnv !== undefined && inputs.vercelEnv !== "")
    ) {
      return { status: "unavailable" };
    }
    const parsed = inputs.databaseUrl
      ? parseDatabaseUrl(inputs.databaseUrl)
      : null;
    const databaseCaPem = normalizePemCertificate(inputs.databaseCaPem);
    if (
      !parsed ||
      !isHostedTarget(parsed, QA_PROJECT_REF) ||
      !databaseCaPem
    ) {
      return { status: "unavailable" };
    }
    return {
      status: "ready",
      environment: "preview",
      clientConfig: {
        connectionString: inputs.databaseUrl!,
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
  values: EventInsertValues,
  diagnosticSink: EventCreatorDiagnosticSink = emitEventCreatorDiagnostic
): Promise<EventInsertOutcome> {
  let dispatched = false;

  try {
    await client.connect();
    dispatched = true;
    const result = await client.query({
      text: EVENT_INSERT_SQL,
      values: [values.title, values.memo, values.shareToken]
    });
    if (result.rowCount === 1) return { status: "created" };
    safeEmitEventCreatorDiagnostic(diagnosticSink, {
      event: "event_creator_failure",
      version: 1,
      phase: "query",
      category: "creator_result_invalid"
    });
    return { status: "failed" };
  } catch (error) {
    const failure = dispatched
      ? classifyQueryFailure(error)
      : classifyConnectFailure(error);
    safeEmitEventCreatorDiagnostic(diagnosticSink, {
      event: "event_creator_failure",
      version: 1,
      phase: dispatched ? "query" : "connect",
      ...failure
    });
    if (dispatched && failure.category === "creator_outcome_unknown") {
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
