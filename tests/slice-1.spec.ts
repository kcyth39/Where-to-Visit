import { expect, test } from "@playwright/test";

import {
  clientForTokens,
  createEvent,
  expectNoHorizontalOverflow,
  hasSupabaseEnv
} from "./helpers";

const outcomeUnknownMessage =
  "作成結果を確認できませんでした。自動では再試行していません。もう一度作ると別の「きめたいこと」が作成される場合があります。";
const rateLimitedMessage =
  "短時間に多くのきめごとが作成されました。しばらくしてからもう一度お試しください。";
const historyKey = "kimenosuke:event-history:v1";

test.describe("N7 HTTP 429 handling", () => {
  for (const response of [
    { name: "HTML", body: "<p>rate-limit-body-sentinel</p>", contentType: "text/html" },
    { name: "empty", body: "", contentType: "text/plain" },
    { name: "malformed JSON", body: "{not-json", contentType: "application/json" }
  ]) {
    test(`shows the canonical message for a ${response.name} body without reading it`, async ({
      page
    }) => {
      let requestCount = 0;
      const title = `[E2E] 429 ${response.name}`;
      const memo = "[E2E] 429 draft";
      const historyValue = JSON.stringify({ version: 1, entries: [] });
      await page.route("**/api/events", async (route) => {
        requestCount += 1;
        await route.fulfill({
          body: response.body,
          contentType: response.contentType,
          status: 429
        });
      });

      await page.goto("/");
      await page.evaluate(
        ({ key, value }) => window.localStorage.setItem(key, value),
        { key: historyKey, value: historyValue }
      );
      await page.getByLabel("きめること").fill(title);
      await page.getByLabel("つたえたいこと").fill(memo);
      await page.getByRole("button", { name: "きめよう！" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "作成", exact: true })
        .click();

      await expect(page.locator('.form-message.error[role="alert"]')).toHaveText(
        rateLimitedMessage
      );
      await expect(page.getByText("rate-limit-body-sentinel")).toHaveCount(0);
      expect(requestCount).toBe(1);
      await expect(page.getByLabel("きめること")).toHaveValue(title);
      await expect(page.getByLabel("つたえたいこと")).toHaveValue(memo);
      await expect(page).toHaveURL(/\/$/);
      await expect
        .poll(() => page.evaluate((key) => window.localStorage.getItem(key), historyKey))
        .toBe(historyValue);
    });
  }

  for (const response of [
    { name: "403 failed", status: 403, result: { status: "failed" } },
    { name: "400 failed", status: 400, result: { status: "failed" } },
    { name: "400 invalid", status: 400, result: { status: "invalid", field: "title" } },
    { name: "503 failed", status: 503, result: { status: "failed" } },
    { name: "503 outcome unknown", status: 503, result: { status: "outcome_unknown" } }
  ]) {
    test(`does not classify ${response.name} as rate limited`, async ({ page }) => {
      let requestCount = 0;
      await page.route("**/api/events", async (route) => {
        requestCount += 1;
        await route.fulfill({
          body: JSON.stringify(response.result),
          contentType: "application/json",
          status: response.status
        });
      });

      await page.goto("/");
      await page.getByLabel("きめること").fill("[E2E] non-429 response");
      await page.getByRole("button", { name: "きめよう！" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "作成", exact: true })
        .click();

      await expect(page.locator('.form-message.error[role="alert"]')).toHaveText(
        response.result.status === "outcome_unknown"
          ? outcomeUnknownMessage
          : "イベントを作成できませんでした。"
      );
      await expect(page.getByText(rateLimitedMessage)).toHaveCount(0);
      expect(requestCount).toBe(1);
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test("keeps a network failure classified as outcome unknown", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/events", async (route) => {
      requestCount += 1;
      await route.abort("failed");
    });

    await page.goto("/");
    await page.getByLabel("きめること").fill("[E2E] network failure");
    await page.getByRole("button", { name: "きめよう！" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "作成", exact: true })
      .click();

    await expect(page.locator('.form-message.error[role="alert"]')).toHaveText(
      outcomeUnknownMessage
    );
    await expect(page.getByText(rateLimitedMessage)).toHaveCount(0);
    expect(requestCount).toBe(1);
    await expect(page).toHaveURL(/\/$/);
  });

  test("keeps valid created navigation distinct from rate limiting", async ({ page }) => {
    let requestCount = 0;
    const path = `/e/${"a".repeat(43)}?created=1`;
    await page.route("**/api/events", async (route) => {
      requestCount += 1;
      await route.fulfill({
        body: JSON.stringify({ status: "created", path }),
        contentType: "application/json",
        status: 201
      });
    });
    await page.route("**/e/**", async (route) => {
      await route.fulfill({ body: "<!doctype html><title>Created</title>" });
    });

    await page.goto("/");
    await page.getByLabel("きめること").fill("[E2E] created response");
    await page.getByRole("button", { name: "きめよう！" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "作成", exact: true })
      .click();

    await expect(page).toHaveURL(/\/e\/[A-Za-z0-9_-]{43}\?created=1$/);
    expect(requestCount).toBe(1);
  });
});

test.describe("Slice 1 creator configuration", () => {
  test("renders the creator without Data API configuration", async ({ page }) => {
    test.skip(
      hasSupabaseEnv,
      "This case covers a process without the Supabase Data API variables."
    );

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "みんなに聞いてみよう！" })
    ).toBeVisible();
    await expect(page.getByLabel("きめること")).toBeEnabled();
    await expect(page.getByLabel("つたえたいこと")).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: "設定を確認してください" })
    ).toHaveCount(0);
  });
});

test("confirms once, keeps drafts, and never retries an unknown creation outcome", async ({
  page
}) => {
  let requestCount = 0;
  await page.route("**/api/events", async (route) => {
    requestCount += 1;
    await route.fulfill({
      body: JSON.stringify({ status: "outcome_unknown" }),
      contentType: "application/json",
      status: 503
    });
  });

  const title = "[E2E] 作成結果不明";
  const memo = "[E2E] 自動再試行しないメモ";
  await page.goto("/");
  await page.getByLabel("きめること").fill(title);
  await page.getByLabel("つたえたいこと").fill(memo);
  await page.getByRole("button", { name: "きめよう！" }).click();

  let dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("この内容で作成してもよろしいですか？");
  await expect(dialog).toContainText(
    "作成後に「きめること」は変更できません。"
  );
  await expect(page.getByLabel("きめること")).toBeDisabled();
  await expect(page.getByLabel("つたえたいこと")).toBeDisabled();
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(dialog).toHaveCount(0);
  expect(requestCount).toBe(0);
  await expect(page.getByLabel("きめること")).toBeEnabled();
  await expect(page.getByLabel("つたえたいこと")).toBeEnabled();
  await expect(page.getByLabel("きめること")).toHaveValue(title);
  await expect(page.getByLabel("つたえたいこと")).toHaveValue(memo);

  await page.getByRole("button", { name: "きめよう！" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "作成", exact: true }).click();
  await expect(
    page.locator('.form-message.error[role="alert"]')
  ).toHaveText(outcomeUnknownMessage);
  expect(requestCount).toBe(1);
  await expect(page.getByLabel("きめること")).toHaveValue(title);
  await expect(page.getByLabel("つたえたいこと")).toHaveValue(memo);
  await expect(page).toHaveURL(/\/$/);
});

test("treats an unrecognized creation response as outcome unknown", async ({
  page
}) => {
  let requestCount = 0;
  await page.route("**/api/events", async (route) => {
    requestCount += 1;
    await route.fulfill({
      body: JSON.stringify({
        status: "created",
        path: "https://example.com/not-a-share-path"
      }),
      contentType: "application/json",
      status: 201
    });
  });

  await page.goto("/");
  await page.getByLabel("きめること").fill("[E2E] invalid response shape");
  await page.getByRole("button", { name: "きめよう！" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "作成", exact: true })
    .click();

  await expect(
    page.locator('.form-message.error[role="alert"]')
  ).toHaveText(outcomeUnknownMessage);
  expect(requestCount).toBe(1);
  await expect(page).toHaveURL(/\/$/);
});

test("keeps drafts and avoids dispatch for an overlong title", async ({
  page
}) => {
  let requestCount = 0;
  await page.route("**/api/events", async (route) => {
    requestCount += 1;
    await route.abort();
  });

  const title = "あ".repeat(81);
  const memo = "[E2E] S1-b failure draft";
  await page.goto("/");
  const titleInput = page.getByLabel("きめること");
  const form = page.locator("form").filter({ has: titleInput });
  await titleInput.evaluate((input, value) => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, title);
  await page.getByLabel("つたえたいこと").fill(memo);

  await page.getByRole("button", { name: "きめよう！" }).click();

  await expect(form.getByRole("alert")).toHaveText(
    "イベントを作成できませんでした。"
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requestCount).toBe(0);
  await expect(titleInput).toHaveValue(title);
  await expect(page.getByLabel("つたえたいこと")).toHaveValue(memo);
  await expect(page).toHaveURL(/\/$/);
});

test("uses the length copy only for memo overflow", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/events", async (route) => {
    requestCount += 1;
    await route.abort();
  });

  await page.goto("/");
  await page.getByLabel("きめること").fill("[E2E] memo validation");
  const memoInput = page.getByLabel("つたえたいこと");
  const form = page.locator("form").filter({ has: memoInput });

  await memoInput.fill("あ".repeat(1001));
  await expect(form.getByText("1001 / 1000", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "きめよう！" }).click();
  await expect(form.locator('.form-message.error[role="alert"]')).toHaveText(
    "つたえたいことは1000文字までです。"
  );

  await memoInput.evaluate((input) => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    setValue?.call(input, "\ud800");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByRole("button", { name: "きめよう！" }).click();
  await expect(form.locator('.form-message.error[role="alert"]')).toHaveText(
    "イベントを作成できませんでした。"
  );
  await expect(form.locator('.form-message.error[role="alert"]')).not.toContainText(
    "1000文字"
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(requestCount).toBe(0);
});

test("creates a share-only event with immutable title and collaborative memo", async ({
  browser,
  context,
  page
}) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const title = `[E2E] 共同編集お題 ${unique}`;

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect
    .poll(() =>
      page.locator(".panel > form > .field").evaluateAll((fields) =>
        fields.map((field) =>
          field.querySelector("span")?.textContent?.trim()
        )
      )
    )
    .toEqual(["きめること", "つたえたいこと"]);
  const decidingInput = page.getByLabel("きめること");
  const memoInput = page.getByLabel("つたえたいこと");
  await expect(decidingInput).toHaveAttribute(
    "placeholder",
    "例）今夜のごはん、旅行の行き先、プレゼント選びなど"
  );
  await expect(memoInput).toHaveAttribute(
    "placeholder",
    "決めたい理由や、大切にしたいこと、予算、日程、避けたいことなど"
  );
  await expect(decidingInput).toHaveAttribute("required", "");
  expect(await memoInput.getAttribute("required")).toBeNull();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "登録なしで使える、みんなで決めるための共有サービス"
  );
  await expect(
    page.getByText(
      "きめることと、必要ならつたえたいことを入れると、みんなで使うリンクができます。リンクを送って、意見を聞いてみよう。"
    )
  ).toBeVisible();
  const titlePlaceholder = page.locator(".wrapping-placeholder-input > span");
  await expect(titlePlaceholder).toHaveCount(1);
  await expect
    .poll(() =>
      titlePlaceholder.evaluate((element) => ({
        horizontal: element.scrollWidth <= element.clientWidth,
        vertical: element.scrollHeight <= element.clientHeight
      }))
    )
    .toEqual({ horizontal: true, vertical: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() =>
      titlePlaceholder.evaluate((element) => ({
        horizontal: element.scrollWidth <= element.clientWidth,
        vertical: element.scrollHeight <= element.clientHeight
      }))
    )
    .toEqual({ horizontal: true, vertical: true });
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.getByLabel("お名前")).toHaveCount(0);
  await expect(page.locator('input[name="attribute"]')).toHaveCount(0);

  await page.goto("/robots.txt");
  await expect(page.locator("body")).toContainText("Disallow: /");

  const created = await createEvent(page, title);
  expect(await context.cookies()).toEqual([]);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("heading", { name: "お名前を入れる" })).toBeVisible();
  await expect(
    page.getByText("お名前と候補を入れたら、さあ、きめましょう！")
  ).toBeVisible();
  await expect(
    page.getByText("ここで選んだ名前が、候補や回答の名義になります。")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "候補の追加" })).toBeVisible();
  await expect(
    page.getByText("候補名だけでも、リンクだけでも追加できます。")
  ).toBeVisible();
  await expect(page.getByLabel("候補名")).not.toHaveAttribute("placeholder");
  await expect(page.getByRole("heading", { name: "URLを送る" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "さあ、きめよう！" })
  ).toBeDisabled();
  await expect(page.getByLabel("きめること")).toHaveCount(0);

  const shareClient = clientForTokens({ shareToken: created.shareToken });
  const [{ count: participantCount }, { data: criteria }] = await Promise.all([
    shareClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", created.eventId),
    shareClient
      .from("criteria")
      .select("label,source")
      .eq("event_id", created.eventId)
  ]);
  expect(participantCount).toBe(0);
  expect(criteria).toEqual([{ label: "興味ある？", source: "default" }]);

  await expect(page).not.toHaveURL(/created=1/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "あなたのお名前" })
  ).toBeVisible();
  await expect(
    page.getByText("お名前と候補を入れたら、さあ、きめましょう！")
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "直す" })).toBeVisible();
  await expect(page.getByLabel("きめること")).toHaveCount(0);

  const firstMemo = `[E2E] share memo ${unique}`;
  await page.getByRole("button", { name: "直す" }).click();
  let editor = page.locator(".inline-editor");
  await editor.getByLabel("つたえたいこと").fill(firstMemo);
  await editor.getByRole("button", { name: "保存" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "変更します、よろしいですか？"
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "変更" })
    .click();
  await expect(page.getByText(firstMemo, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(created.shareUrl);
  await expect(
    freshPage.getByRole("heading", { name: "あなたのお名前" })
  ).toBeVisible();
  await expect(freshPage.getByRole("button", { name: "直す" })).toBeVisible();
  await expect(freshPage.getByLabel("きめること")).toHaveCount(0);
  const secondMemo = `${firstMemo} 更新`;
  await freshPage.getByRole("button", { name: "直す" }).click();
  editor = freshPage.locator(".inline-editor");
  await editor.getByLabel("つたえたいこと").fill(secondMemo);
  await editor.getByRole("button", { name: "保存" }).click();
  await freshPage
    .getByRole("dialog")
    .getByRole("button", { name: "変更" })
    .click();
  await expect(freshPage.getByText(secondMemo, { exact: true })).toBeVisible();
  await expect(freshPage.getByRole("heading", { name: title })).toBeVisible();

  await freshPage.goto("/e/not-a-real-share-token");
  await expect(
    freshPage.getByRole("heading", { name: "きめることが みつかりません" })
  ).toBeVisible();
  const removedRoute = await freshPage.goto("/o/not-a-real-token");
  expect(removedRoute?.status()).toBe(404);

  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expectNoHorizontalOverflow(page);

  await freshContext.close();
});
