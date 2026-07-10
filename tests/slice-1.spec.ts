import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

function readEnvValue(name: string): string | undefined {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const fileName of [".env.local", ".env"]) {
    if (!existsSync(fileName)) {
      continue;
    }

    const line = readFileSync(fileName, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${name}=`));

    const value = line?.slice(name.length + 1).trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

const hasSupabaseEnv = Boolean(
  readEnvValue("SUPABASE_URL") && readEnvValue("SUPABASE_ANON_KEY")
);

test.describe("Slice 1 setup state", () => {
  test.skip(hasSupabaseEnv, "Supabase env is configured; setup warning is hidden.");

  test("shows a configuration error instead of using a local fallback", async ({
    page
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "設定を確認してください" })).toBeVisible();
    await expect(page.getByText("SUPABASE_URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "きめよう！" })).toBeDisabled();
  });
});

test.describe("Slice 1 noindex", () => {
  test("serves robots.txt and noindex metadata", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );

    await page.goto("/robots.txt");
    await expect(page.locator("body")).toContainText("Disallow: /");
  });
});

test.describe("Slice 1 Supabase flow", () => {
  test.skip(
    !hasSupabaseEnv,
    "Supabase env or migration is not prepared; full E2E is pending."
  );

  test("creates, shares, edits, recovers owner access, copies URL, and fits viewports", async ({
    browser,
    context,
    page
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://127.0.0.1:3000"
    });

    const unique = Date.now().toString();
    const title = `[E2E] 夕食相談 ${unique}`;
    const updatedTitle = `[E2E] 夕食相談 更新 ${unique}`;

    await page.goto("/");
    await expect
      .poll(() =>
        page.locator(".panel > form > .field").evaluateAll((fields) =>
          fields.map((field) =>
            field.querySelector("span, legend")?.textContent?.trim()
          )
        )
      )
      .toEqual(["お題", "メモ", "お名前"]);
    await expect(page.getByLabel("お題")).toHaveAttribute(
      "placeholder",
      "例）週末どこ行く？ など"
    );
    await expect(page.locator('input[name="attribute"]')).toHaveCount(0);
    await expect(page.getByText("どんなこと？", { exact: true })).toHaveCount(0);
    await page.getByLabel("メモ").fill("駅から近い店を選びたい");
    await page.getByLabel("お題").fill(title);
    await page.getByLabel("お名前").fill("[E2E] おしげ");
    await page.getByRole("button", { name: "きめよう！" }).click();

    await expect(page).toHaveURL(/\/o\/[^/?]+/);
    await expect(
      page.getByText("あなた専用リンクだよ。無くさないように保存してね。")
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("あなたは お題とメモを直せます")).toBeVisible();

    const shareUrl = await page.locator("code").filter({ hasText: "/e/" }).first().textContent();
    const ownerUrl = await page.locator("code").filter({ hasText: "/o/" }).first().textContent();

    expect(shareUrl).toMatch(/\/e\/[A-Za-z0-9_-]+$/);
    expect(ownerUrl).toMatch(/\/o\/[A-Za-z0-9_-]+$/);

    await page.evaluate(() => {
      let clipboardText = "";

      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: {
          readText: async () => clipboardText,
          writeText: async (value: string) => {
            clipboardText = value;
          }
        }
      });
    });

    const shareCopyButton = page.locator(".copy-button").first();
    await expect(shareCopyButton).toHaveAttribute("data-copy-ready", "true");
    await shareCopyButton.click();
    await expect(shareCopyButton).toHaveText("✓");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(shareUrl);

    await page.getByRole("button", { name: "直す" }).click();
    await page.getByLabel("お題").fill(updatedTitle);
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByRole("dialog")).toContainText("変更します、よろしいですか？");
    await page.getByRole("dialog").getByRole("button", { name: "変更" }).click();
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(page.getByText("保存しました！")).toBeVisible();

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(shareUrl ?? "");
    await expect(guestPage.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(guestPage.getByText("駅から近い店を選びたい")).toBeVisible();
    await expect(guestPage.locator(".event-heading .eyebrow")).toHaveCount(0);
    await expect(guestPage.getByText("たべたりのんだり", { exact: true })).toHaveCount(0);
    await expect(guestPage.getByText("あなたは お題とメモを直せます")).toHaveCount(0);
    const guestCookies = await guestContext.cookies(shareUrl ?? "");
    expect(guestCookies.some((cookie) => cookie.name === "kimenosuke_guest_token")).toBe(
      true
    );
    await guestContext.close();

    const recoveryContext = await browser.newContext();
    const recoveryPage = await recoveryContext.newPage();
    await recoveryPage.goto(ownerUrl ?? "");
    await expect(recoveryPage.getByText("あなたは お題とメモを直せます")).toBeVisible();
    await expect(recoveryPage.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(recoveryPage.getByText("あなた専用リンク")).toBeVisible();
    await expect
      .poll(async () => {
        const cookies = await recoveryContext.cookies(ownerUrl ?? "");
        return cookies.some((cookie) => cookie.name === "kimenosuke_guest_token");
      })
      .toBe(true);
    await recoveryContext.close();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(shareUrl ?? "");
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      )
      .toBe(true);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(shareUrl ?? "");
    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      )
      .toBe(true);
  });
});
