import { NextRequest, NextResponse } from "next/server";

import {
  COOKIE_MAX_AGE_SECONDS,
  GUEST_TOKEN_COOKIE
} from "@/lib/constants";

function createGuestToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(GUEST_TOKEN_COOKIE)?.value) {
    response.cookies.set(GUEST_TOKEN_COOKIE, createGuestToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS
    });
  }

  return response;
}

export const config = {
  matcher: ["/", "/e/:path*", "/o/:path*"]
};
