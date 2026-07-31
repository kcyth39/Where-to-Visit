import "server-only";

import { Client } from "pg";

import {
  EVENT_CREATOR_DATABASE_CA_PEM,
  EVENT_CREATOR_DATABASE_URL,
  executeEventInsert,
  resolveEventCreatorDatabase,
  type EventInsertOutcome,
  type EventInsertValues
} from "@/lib/event-creator-db-contract";

export async function createEventInDatabase(
  values: EventInsertValues
): Promise<EventInsertOutcome> {
  const resolution = resolveEventCreatorDatabase({
    databaseUrl: process.env[EVENT_CREATOR_DATABASE_URL],
    databaseCaPem: process.env[EVENT_CREATOR_DATABASE_CA_PEM],
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
  if (resolution.status === "unavailable") {
    return { status: "failed" };
  }

  return executeEventInsert(new Client(resolution.clientConfig), values);
}
