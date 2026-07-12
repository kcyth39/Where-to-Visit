import { expect, test } from "@playwright/test";

import {
  clientForTokens,
  createEvent,
  expectNoHorizontalOverflow,
  hasSupabaseEnv,
  ownerCookie
} from "./helpers";

test.describe("Slice 1 setup state", () => {
  test.skip(hasSupabaseEnv, "Supabase env is configured; setup warning is hidden.");
  test("shows a configuration error instead of using a local fallback", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "設定を確認してください" })).toBeVisible();
    await expect(page.getByText("SUPABASE_URL")).toBeVisible();
  });
});

test("serves noindex and creates an owner-only event shell", async ({ browser, context, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const title = `[E2E] 共同編集お題 ${unique}`;

  await page.goto("/");
  await expect
    .poll(() =>
      page.locator(".panel > form > .field").evaluateAll((fields) =>
        fields.map((field) => field.querySelector("span")?.textContent?.trim())
      )
    )
    .toEqual(["お題", "メモ"]);
  await expect(page.getByLabel("お名前")).toHaveCount(0);
  await expect(page.locator('input[name="attribute"]')).toHaveCount(0);

  await page.goto("/robots.txt");
  await expect(page.locator("body")).toContainText("Disallow: /");

  const created = await createEvent(page, title);
  await ownerCookie(context, created.shareToken);
  await expect(page.getByRole("heading", { name: "お名前を入れる" }).first()).toBeVisible();
  await expect(page.getByText("まず、あなたのお名前を入力します。ここで選んだ名前が、候補や回答の名義になります。")).toBeVisible();
  await expect(page.getByText("次に、みんなで比べたい候補を挙げます。候補名だけでも、リンクだけでも追加できます。")).toBeVisible();
  await expect(page.getByText(/候補がそろったら、みんなにリンクを送って/)).toBeVisible();

  const shareClient = clientForTokens({ shareToken: created.shareToken });
  const [{ count: participantCount }, { data: criteria }] = await Promise.all([
    shareClient.from("participants").select("id", { count: "exact", head: true }).eq("event_id", created.eventId),
    shareClient.from("criteria").select("label,source").eq("event_id", created.eventId)
  ]);
  expect(participantCount).toBe(0);
  expect(criteria).toEqual([{ label: "興味ある？", source: "default" }]);

  await expect(page).not.toHaveURL(/created=1/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "候補", exact: true })).toBeVisible();
  await expect(page.getByText("まず、あなたのお名前を入力します。")).toHaveCount(0);

  await page.getByRole("button", { name: "直す" }).click();
  const editor = page.locator(".inline-editor");
  await editor.getByLabel("お題").fill(`${title} 更新`);
  await editor.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("dialog")).toContainText("変更します、よろしいですか？");
  await page.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(page.getByRole("heading", { name: `${title} 更新` })).toBeVisible();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(created.shareUrl);
  await expect(guestPage.getByRole("heading", { name: "あなたのお名前" })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "候補", exact: true })).toHaveCount(0);

  const invalidOwnerContext = await browser.newContext();
  const invalidOwnerPage = await invalidOwnerContext.newPage();
  const shareUrl = new URL(created.shareUrl);
  await invalidOwnerContext.addCookies([{
    name: "kimenosuke_owner_token",
    value: "invalid-owner-token-0000000000000000",
    domain: shareUrl.hostname,
    path: `/e/${created.shareToken}`,
    httpOnly: true,
    secure: shareUrl.protocol === "https:"
  }]);
  await invalidOwnerPage.goto(created.shareUrl);
  await expect(invalidOwnerPage.getByRole("heading", { name: "あなたのお名前" })).toBeVisible();
  await expect(invalidOwnerPage.getByRole("button", { name: "直す" })).toHaveCount(0);

  const recoveredContext = await browser.newContext();
  const recoveredPage = await recoveredContext.newPage();
  await recoveredPage.goto(created.ownerUrl);
  await expect(recoveredPage.getByRole("heading", { name: `${title} 更新` })).toBeVisible();
  await expect(recoveredPage.getByRole("button", { name: "直す" })).toBeVisible();
  await ownerCookie(recoveredContext, created.shareToken);

  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expectNoHorizontalOverflow(page);

  await guestContext.close();
  await invalidOwnerContext.close();
  await recoveredContext.close();
});
