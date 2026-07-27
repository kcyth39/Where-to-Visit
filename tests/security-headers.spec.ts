import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

type Header = {
  key: string;
  value: string;
};

const productionCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const previewCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: blob: https://vercel.live https://vercel.com",
  "font-src 'self' https://vercel.live https://assets.vercel.com",
  "connect-src 'self' https://vercel.live wss://ws-us3.pusher.com",
  "frame-src https://vercel.live",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const developmentCsp = productionCsp
  .replace(
    "script-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  )
  .replace(
    "connect-src 'self'",
    "connect-src 'self' ws://localhost:* ws://127.0.0.1:*"
  );

const commonHeaders: Header[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  },
  { key: "X-Frame-Options", value: "DENY" }
];

function configuredHeaders(environment: {
  nodeEnv: "development" | "production" | "test";
  vercelEnv?: string;
}): Header[] {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: environment.nodeEnv
  };
  if (environment.vercelEnv === undefined) {
    delete env.VERCEL_ENV;
  } else {
    env.VERCEL_ENV = environment.vercelEnv;
  }

  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      [
        'import config from "./next.config.mjs";',
        "const rules = await config.headers();",
        "process.stdout.write(JSON.stringify(rules));"
      ].join("")
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env
    }
  );
  const rules = JSON.parse(output) as Array<{
    source: string;
    headers: Header[];
  }>;
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/:path*");
  return rules[0].headers;
}

function expectExactHeaders(headers: Header[], csp: string) {
  expect(headers).toEqual([
    { key: "Content-Security-Policy", value: csp },
    ...commonHeaders
  ]);
  expect(headers.find(({ key }) => key === "Strict-Transport-Security")).toBe(
    undefined
  );
}

test.describe("security header configuration", () => {
  test("uses the exact Production baseline without Vercel Toolbar sources", () => {
    const headers = configuredHeaders({
      nodeEnv: "production",
      vercelEnv: "production"
    });
    expectExactHeaders(headers, productionCsp);
    expect(productionCsp).not.toMatch(
      /vercel\.live|vercel\.com|assets\.vercel\.com|pusher\.com/
    );
    expect(productionCsp).not.toContain("'unsafe-eval'");
  });

  test("adds only the required Vercel Toolbar sources in Preview", () => {
    const headers = configuredHeaders({
      nodeEnv: "production",
      vercelEnv: "preview"
    });
    expectExactHeaders(headers, previewCsp);
    for (const source of [
      "https://vercel.live",
      "https://vercel.com",
      "https://assets.vercel.com",
      "wss://ws-us3.pusher.com"
    ]) {
      expect(previewCsp).toContain(source);
    }
  });

  test("adds only local development script and websocket allowances", () => {
    const headers = configuredHeaders({ nodeEnv: "development" });
    expectExactHeaders(headers, developmentCsp);
    expect(developmentCsp).toContain("'unsafe-eval'");
    expect(developmentCsp).toContain("ws://localhost:*");
    expect(developmentCsp).toContain("ws://127.0.0.1:*");
    expect(developmentCsp).not.toContain("vercel.live");
  });
});

test("returns the Development baseline without CSP violations", async ({
  page
}) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
  });
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, "__securityPolicyViolations", {
      value: violations
    });
    document.addEventListener("securitypolicyviolation", (event) => {
      violations.push(`${event.violatedDirective}:${event.blockedURI}`);
    });
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toBe(developmentCsp);
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["strict-transport-security"]).toBeUndefined();
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & {
            __securityPolicyViolations: string[];
          }
        ).__securityPolicyViolations
    )
  ).toEqual([]);
});
