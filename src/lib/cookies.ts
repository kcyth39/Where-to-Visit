import { cookies } from "next/headers";

import { COOKIE_MAX_AGE_SECONDS, GUEST_TOKEN_COOKIE } from "@/lib/constants";

export async function getGuestTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_TOKEN_COOKIE)?.value;
}

export async function setGuestTokenCookie(guestToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_TOKEN_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS
  });
}
