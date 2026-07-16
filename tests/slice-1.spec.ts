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

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect
    .poll(() =>
      page.locator(".panel > form > .field").evaluateAll((fields) =>
        fields.map((field) => field.querySelector("span")?.textContent?.trim())
      )
    )
    .toEqual(["きめること", "つたえておきたいこと（任意）"]);
  const decidingInput = page.getByLabel("きめること");
  const contextInput = page.getByLabel("つたえておきたいこと（任意）");
  await expect(decidingInput).toHaveAttribute(
    "placeholder",
    "例）今夜のごはん、旅行の行き先、プレゼント選びなど"
  );
  await expect(contextInput).toHaveAttribute(
    "placeholder",
    "決めたい理由や、大切にしたいこと、予算、日程、避けたいことなど"
  );
  await expect(decidingInput).toHaveAttribute("required", "");
  expect(await contextInput.getAttribute("required")).toBeNull();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "登録なしで使える、みんなで決めるための共有サービス"
  );
  await expect(page.getByText("きめることと、必要ならつたえておきたいことを入れると、みんなに送るリンクと、あとで直せるあなた専用リンクができます。みんなにリンクを送って、意見を聞いてみよう。")).toBeVisible();
  const titlePlaceholder = page.locator(".wrapping-placeholder-input > span");
  await expect(titlePlaceholder).toHaveCount(1);
  await expect.poll(() => titlePlaceholder.evaluate((element) => ({
    horizontal: element.scrollWidth <= element.clientWidth,
    vertical: element.scrollHeight <= element.clientHeight
  }))).toEqual({ horizontal: true, vertical: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => titlePlaceholder.evaluate((element) => ({
    horizontal: element.scrollWidth <= element.clientWidth,
    vertical: element.scrollHeight <= element.clientHeight
  }))).toEqual({ horizontal: true, vertical: true });
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.getByLabel("お名前")).toHaveCount(0);
  await expect(page.locator('input[name="attribute"]')).toHaveCount(0);

  await page.goto("/robots.txt");
  await expect(page.locator("body")).toContainText("Disallow: /");

  const created = await createEvent(page, title);
  await ownerCookie(context, created.shareToken);
  await expect(page.getByRole("heading", { name: "お名前を入れる" })).toBeVisible();
  await expect(page.getByText("お名前と候補を入れたら、さあ、きめましょう！")).toBeVisible();
  await expect(page.getByText("ここで選んだ名前が、候補や回答の名義になります。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "候補の追加" })).toBeVisible();
  await expect(page.getByText("候補名だけでも、リンクだけでも追加できます。")).toBeVisible();
  await expect(page.getByLabel("候補名")).not.toHaveAttribute("placeholder");
  await expect(page.getByRole("heading", { name: "URLを送る" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "スタート", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "さあ、きめよう！" })).toBeDisabled();

  const shareClient = clientForTokens({ shareToken: created.shareToken });
  const [{ count: participantCount }, { data: criteria }] = await Promise.all([
    shareClient.from("participants").select("id", { count: "exact", head: true }).eq("event_id", created.eventId),
    shareClient.from("criteria").select("label,source").eq("event_id", created.eventId)
  ]);
  expect(participantCount).toBe(0);
  expect(criteria).toEqual([{ label: "興味ある？", source: "default" }]);

  await expect(page).not.toHaveURL(/created=1/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "お名前を選んで判断" })).toBeVisible();
  await expect(page.getByRole("button", { name: "お名前を選ぶ" })).toBeVisible();
  await expect(page.getByText("いまの回答者")).toHaveCount(0);
  await expect(page.getByText("お名前と候補を入れたら、さあ、きめましょう！")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "URLを送る" })).toBeVisible();

  await page.getByRole("button", { name: "直す" }).click();
  const editor = page.locator(".inline-editor");
  await expect(editor.getByLabel("つたえておきたいこと（任意）")).toBeVisible();
  await editor.getByLabel("きめること").fill("");
  await editor.getByRole("button", { name: "保存" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(page.locator(".form-message.error")).toContainText("きめることを入力してください。");
  await page.getByRole("dialog").getByRole("button", { name: "キャンセル" }).click();
  await editor.getByLabel("きめること").fill(`${title} 更新`);
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
  await invalidOwnerPage.goto("/e/not-a-real-share-token");
  await expect(invalidOwnerPage.getByRole("heading", { name: "きめることが みつかりません" })).toBeVisible();

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
