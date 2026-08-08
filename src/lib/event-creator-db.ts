import "server-only";

import { Client } from "pg";

import {
  EVENT_CREATOR_DATABASE_CA_PEM,
  EVENT_CREATOR_DATABASE_URL,
  emitEventCreatorDiagnostic,
  executeEventInsert,
  resolveEventCreatorDatabase,
  safeEmitEventCreatorDiagnostic,
  type EventCreatorDiagnosticSink,
  type EventInsertOutcome,
  type EventInsertValues
} from "@/lib/event-creator-db-contract";

export async function createEventInDatabase(
  values: EventInsertValues,
  diagnosticSink: EventCreatorDiagnosticSink = emitEventCreatorDiagnostic
): Promise<EventInsertOutcome> {
  const resolution = resolveEventCreatorDatabase({
    databaseUrl: process.env[EVENT_CREATOR_DATABASE_URL],
    databaseCaPem: process.env[EVENT_CREATOR_DATABASE_CA_PEM],
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    supabaseTarget: process.env.KIMENOSUKE_SUPABASE_TARGET
  });
  if (resolution.status === "unavailable") {
    safeEmitEventCreatorDiagnostic(diagnosticSink, {
      event: "event_creator_failure",
      version: 1,
      phase: "config",
      category: "creator_config_invalid"
    });
    return { status: "failed" };
  }

  return executeEventInsert(
    new Client(resolution.clientConfig),
    values,
    diagnosticSink
  );
}
