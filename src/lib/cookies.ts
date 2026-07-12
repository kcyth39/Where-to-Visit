import { cookies } from "next/headers";

import {
  COOKIE_MAX_AGE_SECONDS,
  OWNER_TOKEN_COOKIE
} from "@/lib/constants";

export async function getOwnerTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(OWNER_TOKEN_COOKIE)?.value;
}

export async function setOwnerTokenCookie(
  ownerToken: string,
  shareToken: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OWNER_TOKEN_COOKIE, ownerToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/e/${shareToken}`,
    maxAge: COOKIE_MAX_AGE_SECONDS
  });
}
