import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import {
  resolveTrustedOriginValue,
  type TrustedOriginInputs
} from "../src/lib/trusted-origin";
import {
  addCandidate,
  createEvent,
  hasSupabaseEnv
} from "./helpers";

const unavailableMessage =
  "URLを生成できませんでした。しばらくしてからもう一度お試しください。";

function expectReady(inputs: TrustedOriginInputs, expected: string) {
  expect(resolveTrustedOriginValue(inputs)).toEqual({
    status: "ready",
    origin: expected
  });
}

function expectUnavailable(inputs: TrustedOriginInputs) {
  expect(resolveTrustedOriginValue(inputs)).toEqual({
    status: "unavailable"
  });
}

test.describe("trusted origin pure contract", () => {
  test("accepts only the canonical Production origin", () => {
    expectReady(
      {
        appOrigin: "https://www.kimenosuke.com",
        nodeEnv: "production"
      },
      "https://www.kimenosuke.com"
    );
    expectUnavailable({
      appOrigin: "https://kimenosuke.com",
      nodeEnv: "production"
    });
    expectUnavailable({
      appOrigin: "https://www.kimenosuke.com/",
      nodeEnv: "production"
    });
  });

  test("allows only explicit loopback HTTP ports locally", () => {
    expectReady(
      {
        appOrigin: "http://localhost:3000",
        nodeEnv: "development"
      },
      "http://localhost:3000"
    );
    expectReady(
      {
        appOrigin: "http://127.0.0.1:65535",
        nodeEnv: "test"
      },
      "http://127.0.0.1:65535"
    );

    for (const appOrigin of [
      "http://localhost",
      "http://localhost:80",
      "https://localhost:3000",
      "http://127.0.0.1:0",
      "http://127.0.0.1:65536",
      "http://192.168.1.10:3000",
      "http://dev.local:3000",
      "http://[::1]:3000"
    ]) {
      expectUnavailable({ appOrigin, nodeEnv: "development" });
    }
  });

  test("uses validated APP_ORIGIN before Preview VERCEL_URL", () => {
    expectReady(
      {
        appOrigin: "https://preview.example.com",
        nodeEnv: "production",
        vercelEnv: "preview",
        vercelUrl: "fallback.vercel.app"
      },
      "https://preview.example.com"
    );
    expectReady(
      {
        nodeEnv: "production",
        vercelEnv: "preview",
        vercelUrl: "preview-project.vercel.app"
      },
      "https://preview-project.vercel.app"
    );
    expectUnavailable({
      appOrigin: "https://preview.example.com/",
      nodeEnv: "production",
      vercelEnv: "preview",
      vercelUrl: "fallback.vercel.app"
    });
    expectUnavailable({
      appOrigin: "",
      nodeEnv: "production",
      vercelEnv: "preview",
      vercelUrl: "fallback.vercel.app"
    });
    expectUnavailable({
      nodeEnv: "production",
      vercelEnv: "preview",
      vercelUrl: "https://preview-project.vercel.app"
    });
  });

  test("rejects unknown environments and non-origin URL features", () => {
    expectUnavailable({
      appOrigin: "https://www.kimenosuke.com",
      nodeEnv: "staging"
    });

    for (const appOrigin of [
      " http://127.0.0.1:3000",
      "http://127.0.0.1:3000 ",
      "http://user@127.0.0.1:3000",
      "http://127.0.0.1:3000/path",
      "http://127.0.0.1:3000?query=1",
      "http://127.0.0.1:3000#fragment"
    ]) {
      expectUnavailable({ appOrigin, nodeEnv: "development" });
    }
  });

  test("keeps request headers and public origin configuration out of URL generation", () => {
    const originSource = readFileSync(
      join(process.cwd(), "src/lib/origin.ts"),
      "utf8"
    );
    const pageSources = [
      "src/app/e/[shareToken]/page.tsx",
      "src/app/e/[shareToken]/c/[candidateId]/page.tsx"
    ]
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");
    const eventAppSource = readFileSync(
      join(process.cwd(), "src/components/EventApp.tsx"),
      "utf8"
    );

    expect(originSource).not.toMatch(/headers\s*\(/);
    expect(originSource).not.toMatch(
      /x-forwarded-host|x-forwarded-proto|forwarded|host\b/i
    );
    expect(`${originSource}\n${pageSources}`).not.toMatch(
      /NEXT_PUBLIC_[A-Z0-9_]*ORIGIN/
    );
    expect(eventAppSource).not.toMatch(/\borigin:\s*string\b/);
    expect(eventAppSource).not.toMatch(/\borigin=\{/);
  });
});

async function prepareSharingStep(
  page: Parameters<typeof createEvent>[0]
) {
  const unique = Date.now();
  const created = await createEvent(
    page,
    `[E2E] trusted origin ${unique}`
  );
  await page
    .getByLabel("直接入力")
    .fill(`[E2E] origin participant ${unique}`);
  await page.getByLabel("直接入力").press("Enter");
  await addCandidate(page, `[E2E] origin candidate ${unique}`);
  await page.getByRole("button", { name: "さあ、きめよう！" }).click();
  return {
    candidateTitle: `[E2E] origin candidate ${unique}`,
    created
  };
}

test("uses one server-composed sharing link in post-create and dashboard views", async ({
  context,
  page
}, testInfo) => {
  test.skip(
    testInfo.project.name === "origin-unavailable",
    "Normal trusted-origin coverage runs on the standard harness."
  );
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:3000"
  });

  const { candidateTitle, created } = await prepareSharingStep(page);
  const setup = page.locator(".setup-share-step");
  const expectedShareUrl = `http://127.0.0.1:3000/e/${created.shareToken}`;

  await expect(setup.locator("code")).toHaveText(expectedShareUrl);
  await setup.getByRole("button", { name: "コピー" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    expectedShareUrl
  );
  const opinionLink = setup.getByRole("link", {
    name: "わたしの意見を入力"
  });
  await expect(opinionLink).toHaveAttribute(
    "href",
    `/e/${created.shareToken}`
  );
  await opinionLink.click();
  await expect(page).toHaveURL(expectedShareUrl);

  const sharing = page.locator(".sharing-section");
  await expect(sharing.locator("code")).toHaveText(expectedShareUrl);
  const copyButtons = sharing.getByRole("button", {
    name: "コピー",
    exact: true
  });
  await expect(copyButtons).toHaveCount(1);
  await copyButtons.click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    expectedShareUrl
  );

  await page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: candidateTitle })
    .click();
  await expect(page).toHaveURL(/\/e\/[^/]+\/c\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "URLを送る" })).toHaveCount(0);
  await expect(page.getByText(unavailableMessage)).toHaveCount(0);
});

test("fails closed when trusted origin is unavailable", async ({
  page
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "origin-unavailable",
    "Unavailable-origin coverage uses its isolated harness."
  );
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          const target = window as typeof window & {
            __originClipboardWrites?: number;
          };
          target.__originClipboardWrites =
            (target.__originClipboardWrites ?? 0) + 1;
        }
      }
    });
  });

  const { candidateTitle, created } = await prepareSharingStep(page);
  const setup = page.locator(".setup-share-step");
  await expect(setup.getByText(unavailableMessage)).toBeVisible();
  await expect(setup.locator("code")).toHaveCount(0);
  await expect(setup.getByRole("button", { name: "コピー" })).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __originClipboardWrites?: number })
          .__originClipboardWrites ?? 0
    )
  ).toBe(0);

  const setupText = await setup.innerText();
  expect(setupText).not.toContain(created.shareToken);
  expect(setupText).not.toContain("APP_ORIGIN");
  expect(setupText).not.toContain("VERCEL_URL");

  await setup.getByRole("link", { name: "わたしの意見を入力" }).click();
  await expect(page).toHaveURL(created.shareUrl);
  const sharing = page.locator(".sharing-section");
  await expect(sharing.getByText(unavailableMessage)).toBeVisible();
  await expect(sharing.locator("code")).toHaveCount(0);
  await expect(sharing.getByRole("button", { name: "コピー" })).toBeDisabled();

  const updatedMemo = `[E2E] unavailable edit ${Date.now()}`;
  await page.getByRole("button", { name: "直す" }).click();
  await page
    .getByLabel("つたえたいこと")
    .fill(updatedMemo);
  await page.getByRole("button", { name: "保存" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(page.getByText(updatedMemo, { exact: true })).toBeVisible();

  await page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: candidateTitle })
    .click();
  await expect(page).toHaveURL(/\/e\/[^/]+\/c\/[^/]+$/);
  await expect(page.getByText(unavailableMessage)).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __originClipboardWrites?: number })
          .__originClipboardWrites ?? 0
    )
  ).toBe(0);
});
