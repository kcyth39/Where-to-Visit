import "server-only";

import {
  resolveTrustedOriginValue,
  type SharingLinks,
  type TrustedOriginResolution
} from "@/lib/trusted-origin";

export function resolveTrustedOrigin(): TrustedOriginResolution {
  return resolveTrustedOriginValue({
    appOrigin: process.env.APP_ORIGIN,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL
  });
}

export function createSharingLinks(
  resolution: TrustedOriginResolution,
  shareToken: string
): SharingLinks {
  if (resolution.status === "unavailable") {
    return { status: "unavailable" };
  }

  return {
    status: "ready",
    shareUrl: new URL(`/e/${shareToken}`, resolution.origin).toString()
  };
}
