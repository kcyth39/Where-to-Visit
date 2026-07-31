export type TrustedOriginEnvironment =
  | "production"
  | "preview"
  | "local"
  | "unknown";

export type TrustedOriginInputs = {
  appOrigin?: string;
  nodeEnv?: string;
  vercelEnv?: string;
  vercelUrl?: string;
};

export type TrustedOriginResolution =
  | { status: "ready"; origin: string }
  | { status: "unavailable" };

export type SharingLinks =
  | {
      status: "ready";
      shareUrl: string;
    }
  | {
      status: "unavailable";
    };

export function classifyTrustedOriginEnvironment({
  nodeEnv,
  vercelEnv
}: Pick<TrustedOriginInputs, "nodeEnv" | "vercelEnv">): TrustedOriginEnvironment {
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "production") return "production";
  if (vercelEnv !== undefined && vercelEnv !== "") return "unknown";
  if (nodeEnv === "production") return "production";
  if (nodeEnv === "development" || nodeEnv === "test") return "local";
  return "unknown";
}

function parseExactOrigin(rawValue: string): URL | null {
  if (!rawValue || rawValue.trim() !== rawValue) return null;

  try {
    const parsed = new URL(rawValue);
    if (parsed.username || parsed.password) return null;
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    if (parsed.origin !== rawValue) return null;
    return parsed;
  } catch {
    return null;
  }
}

function validateOriginForEnvironment(
  rawValue: string,
  environment: Exclude<TrustedOriginEnvironment, "unknown">
): string | null {
  const parsed = parseExactOrigin(rawValue);
  if (!parsed) return null;

  if (environment === "production") {
    return rawValue === "https://www.kimenosuke.com" ? rawValue : null;
  }

  if (environment === "preview") {
    return parsed.protocol === "https:" ? rawValue : null;
  }

  const explicitPort = parsed.port;
  const port = Number(explicitPort);
  const localHost =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (
    parsed.protocol !== "http:" ||
    !localHost ||
    !explicitPort ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    return null;
  }

  return rawValue;
}

function previewVercelOrigin(vercelUrl: string | undefined): string | null {
  if (!vercelUrl || vercelUrl.trim() !== vercelUrl) return null;
  if (vercelUrl.includes("://")) return null;
  return validateOriginForEnvironment(`https://${vercelUrl}`, "preview");
}

export function resolveTrustedOriginValue(
  inputs: TrustedOriginInputs
): TrustedOriginResolution {
  const environment = classifyTrustedOriginEnvironment(inputs);
  if (environment === "unknown") return { status: "unavailable" };

  if (inputs.appOrigin !== undefined) {
    const origin = validateOriginForEnvironment(inputs.appOrigin, environment);
    return origin
      ? { status: "ready", origin }
      : { status: "unavailable" };
  }

  if (environment === "preview") {
    const origin = previewVercelOrigin(inputs.vercelUrl);
    return origin
      ? { status: "ready", origin }
      : { status: "unavailable" };
  }

  return { status: "unavailable" };
}
