import { NextResponse } from "next/server";

import { claimOwnerSession } from "@/lib/events";

type RouteContext = {
  params: Promise<{ ownerToken: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { ownerToken } = await context.params;
  const result = await claimOwnerSession(ownerToken);

  if (!result.data) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { shareToken } = result.data;
  return NextResponse.json({ ok: true, shareToken });
}
