import { NextResponse } from "next/server";

import { resolveEventCreation } from "@/lib/event-creator-db-contract";
import type { CreateEventRouteResult } from "@/lib/event-types";
import { createToken } from "@/lib/tokens";

export const runtime = "nodejs";

function response(body: CreateEventRouteResult, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response({ status: "failed" }, 400);
  }
  const result = await resolveEventCreation(
    body,
    async (values) => {
      const { createEventInDatabase } = await import(
        "@/lib/event-creator-db"
      );
      return createEventInDatabase(values);
    },
    createToken
  );
  if (result.status === "created") return response(result, 201);
  if (result.status === "invalid") return response(result, 400);
  return response(result, 503);
}
