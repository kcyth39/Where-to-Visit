import { expect, test, type Page } from "@playwright/test";

import {
  addCandidate,
  clientForTokens,
  createEvent,
  createOrSelectParticipant,
  expectNoHorizontalOverflow,
  hasSupabaseEnv,
  ownerCookie
} from "./helpers";

async function expectEventLink(page: Page, name: "候補一覧" | "一覧に戻る", shareToken: string) {
  const link = page.getByRole("link", { name, exact: true });
  await expect(link).toHaveAttribute("href", `/e/${shareToken}`);
  await expect(link).not.toHaveAttribute("aria-current", "page");
  return link;
}

async function createSummaryFixture(page: Page, unique: number) {
  const created = await createEvent(page, `[E2E] サマリー ${unique}`);
  const longUrl = `https://example.com/${"very-long-path-".repeat(12)}${unique}`;
  const firstTitle = `[E2E] 第一候補 ${unique}`;
  const thirdTitle = `[E2E] URLなし ${unique}`;

  await addCandidate(page, firstTitle, longUrl);
  await addCandidate(page, "", `https://example.com/link-only-${unique}`);
  await addCandidate(page, thirdTitle);
  await page.getByRole("link", { name: "候補一覧" }).click();

  const client = clientForTokens({ shareToken: created.shareToken });
  const participantNames = Array.from(
    { length: 5 },
    (_, index) => `[E2E] 集計回答者${index + 1} ${unique}`
  );
  const { data: participants, error: participantError } = await client
    .from("participants")
    .insert(
      participantNames.map((displayName) => ({
        event_id: created.eventId,
        display_name: displayName
      }))
    )
    .select("id,display_name");
  expect(participantError).toBeNull();

  const { data: candidates, error: candidateError } = await client
    .from("candidates")
    .select("id,title,url,created_at")
    .eq("event_id", created.eventId)
    .order("created_at")
    .order("id");
  expect(candidateError).toBeNull();
  expect(candidates).toHaveLength(3);

  const first = candidates!.find((candidate) => candidate.title === firstTitle)!;
  const linkOnly = candidates!.find((candidate) => !candidate.title)!;
  const third = candidates!.find((candidate) => candidate.title === thirdTitle)!;
  const participantIds = participants!.map((participant) => participant.id);

  const { error: voteError } = await client.from("votes").insert([
    { candidate_id: first.id, participant_id: participantIds[0], value: "positive" },
    { candidate_id: first.id, participant_id: participantIds[1], value: "positive" },
    { candidate_id: first.id, participant_id: participantIds[2], value: "neutral" },
    { candidate_id: first.id, participant_id: participantIds[3], value: "veto" },
    { candidate_id: linkOnly.id, participant_id: participantIds[0], value: "positive" },
    { candidate_id: linkOnly.id, participant_id: participantIds[1], value: "positive" }
  ]);
  expect(voteError).toBeNull();

  const { data: criterion, error: criterionError } = await client
    .from("criteria")
    .select("id")
    .eq("event_id", created.eventId)
    .eq("label", "興味ある？")
    .single<{ id: string }>();
  expect(criterionError).toBeNull();

  const { error: reactionError } = await client.from("reactions").insert([
    {
      candidate_id: first.id,
      participant_id: participantIds[0],
      criterion_id: criterion!.id
    },
    {
      candidate_id: first.id,
      participant_id: participantIds[1],
      criterion_id: criterion!.id
    }
  ]);
  expect(reactionError).toBeNull();
  const { error: concernError } = await client.from("concerns").insert({
    candidate_id: first.id,
    participant_id: participantIds[2],
    criterion_id: criterion!.id
  });
  expect(concernError).toBeNull();

  await page.reload();
  await expect(page.getByRole("table", { name: "候補のまとめ" })).toBeVisible();

  return {
    created,
    first,
    firstTitle,
    linkOnly,
    longUrl,
    participantNames,
    third,
    thirdTitle
  };
}

test("keeps topbar behavior across all five event views", async ({ browser, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const created = await createEvent(page, `[E2E] 戻り導線 ${unique}`);

  await expectEventLink(page, "候補一覧", created.shareToken);

  const loadingContext = await browser.newContext({ javaScriptEnabled: false });
  const loadingPage = await loadingContext.newPage();
  await loadingPage.goto(created.shareUrl);
  await expect(loadingPage.getByText("読み込み中...", { exact: true })).toBeVisible();
  await expectEventLink(loadingPage, "候補一覧", created.shareToken);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(created.shareUrl);
  await expect(guestPage.getByRole("heading", { name: "あなたのお名前" })).toBeVisible();
  await expectEventLink(guestPage, "候補一覧", created.shareToken);

  await page.getByRole("link", { name: "候補一覧" }).click();
  await expect(page).toHaveURL(created.shareUrl);
  await expect(page.getByRole("table", { name: "候補のまとめ" })).toHaveCount(0);
  await expect(page.getByText("候補はまだありません。", { exact: true })).toBeVisible();

  await expect(page.locator(".event-nav-link")).toHaveCount(0);
  await expect(page.getByText("一覧に戻る", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "一覧に戻る" })).toHaveCount(0);

  const candidateTitle = `[E2E] 戻れる候補 ${unique}`;
  await addCandidate(page, candidateTitle);
  const summaryLink = page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: candidateTitle, exact: true });
  await summaryLink.focus();
  await summaryLink.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/e/${created.shareToken}/c/[^/]+$`));
  const backLink = await expectEventLink(page, "一覧に戻る", created.shareToken);
  await backLink.focus();
  await backLink.press("Enter");
  await expect(page).toHaveURL(created.shareUrl);

  await page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: candidateTitle, exact: true })
    .click();
  await (await expectEventLink(page, "一覧に戻る", created.shareToken)).click();
  await expect(page).toHaveURL(created.shareUrl);

  await loadingContext.close();
  await guestContext.close();
});

test("renders the interactive summary from existing candidate aggregates", async ({ browser, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const fixture = await createSummaryFixture(page, unique);
  const table = page.getByRole("table", { name: "候補のまとめ" });

  await expect(table.locator("caption")).toHaveText("候補のまとめ");
  await expect(table.getByRole("columnheader")).toHaveCount(0);
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await expect(table.locator(".dashboard-summary-name a")).toHaveText([
    fixture.firstTitle,
    "リンク候補",
    fixture.thirdTitle
  ]);

  const firstRow = table.locator("tbody tr").filter({ hasText: fixture.firstTitle });
  await expect(firstRow.locator(".dashboard-summary-url-link")).toHaveText(fixture.longUrl);
  await expect(firstRow.locator(".dashboard-summary-url-link")).toHaveAttribute(
    "target",
    "_blank"
  );
  await expect(firstRow.locator(".dashboard-summary-url-link")).toHaveAttribute(
    "rel",
    "noopener noreferrer"
  );
  await expect(firstRow.locator(".dashboard-summary-url-link")).not.toHaveAttribute("title");
  await expect(firstRow.locator(".dashboard-summary-url-link")).toHaveCSS(
    "text-overflow",
    "ellipsis"
  );
  await expect(firstRow.getByRole("button", { name: `${fixture.firstTitle}を○に評価` })).toContainText("2");
  await expect(firstRow.getByRole("button", { name: `${fixture.firstTitle}を−に評価` })).toContainText("1");
  await expect(firstRow.getByRole("button", { name: `${fixture.firstTitle}を×に評価` })).toContainText("1");
  const heartTrigger = firstRow.locator(".dashboard-summary-reaction-trigger.heart");
  const concernTrigger = firstRow.locator(".dashboard-summary-reaction-trigger.concern");
  await expect(heartTrigger).toHaveText("❤️2");
  await expect(concernTrigger).toHaveText("🌀1");
  await expect(heartTrigger).toHaveCSS("border-top-style", "none");
  await expect(concernTrigger).toHaveCSS("border-top-style", "none");
  await expect(heartTrigger.locator("span[aria-hidden='true']")).toHaveCSS("filter", "none");
  await expect(concernTrigger.locator("span[aria-hidden='true']")).toHaveCSS("filter", "none");
  await expect(heartTrigger).not.toHaveAttribute("data-active");
  await expect(concernTrigger).not.toHaveAttribute("data-active");
  await expect(firstRow).toHaveAttribute("data-decision-state", "discussion");

  const linkOnlyRow = table.locator("tbody tr").filter({ hasText: "リンク候補" });
  await expect(linkOnlyRow).toHaveAttribute("data-decision-state", "clear");
  await expect(linkOnlyRow).toContainText("有力候補、最多の○かつ×なし");
  const thirdRow = table.locator("tbody tr").filter({ hasText: fixture.thirdTitle });
  await expect(thirdRow).toHaveAttribute("data-decision-state", "none");
  await expect(thirdRow.locator(".dashboard-summary-url")).toHaveText("URLなし");
  await expect(thirdRow.getByRole("button", { name: `${fixture.thirdTitle}を−に評価` })).toContainText("0");

  await expect(page.locator(".candidate-summary-card")).toHaveCount(0);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(fixture.created.shareUrl);
  await guestPage.getByRole("button", { name: fixture.participantNames[0], exact: true }).click();
  const guestTable = guestPage.getByRole("table", { name: "候補のまとめ" });
  await expect(guestTable.locator("tbody tr")).toHaveCount(3);
  expect(await guestTable.locator("tbody tr").allTextContents()).toEqual(
    await table.locator("tbody tr").allTextContents()
  );
  await guestContext.close();
});

test("separates summary controls, candidate link, and external URL navigation", async ({ page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const fixture = await createSummaryFixture(page, Date.now());
  const table = page.getByRole("table", { name: "候補のまとめ" });
  const firstRow = table.locator("tbody tr").filter({ hasText: fixture.firstTitle });
  const dashboardUrl = page.url();

  await page.context().route("https://example.com/**", (route) =>
    route.fulfill({
      body: "<!doctype html><title>External candidate</title>",
      contentType: "text/html",
      status: 200
    })
  );
  const popupPromise = page.waitForEvent("popup");
  await firstRow.locator(".dashboard-summary-url-link").click();
  const popup = await popupPromise;
  await expect(page).toHaveURL(dashboardUrl);
  await expect.poll(() => popup.url()).toBe(fixture.longUrl);
  await popup.close();

  await firstRow.locator(".dashboard-summary-name").click({ position: { x: 4, y: 4 } });
  await expect(page).toHaveURL(dashboardUrl);

  await firstRow.locator(".dashboard-summary-reaction-trigger.heart").click();
  const criterionDialog = page.getByRole("dialog", { name: fixture.firstTitle });
  await expect(criterionDialog).not.toContainText("判断基準ごとの❤️・🌀");
  await page.getByRole("button", { name: "反応入力を閉じる" }).click();
  await expect(page).toHaveURL(dashboardUrl);

  const candidateLink = page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: fixture.firstTitle, exact: true });
  await candidateLink.focus();
  await candidateLink.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/e/${fixture.created.shareToken}/c/${fixture.first.id}$`)
  );
});

test("resumes a candidate-detail vote once after selecting a participant", async ({ browser, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const participantName = `[E2E] 詳細回答者 ${unique}`;
  const candidateTitle = `[E2E] 詳細候補 ${unique}`;
  const created = await createEvent(page, `[E2E] 詳細保留操作 ${unique}`);
  await createOrSelectParticipant(page, participantName);
  await addCandidate(page, candidateTitle);
  await page.getByRole("button", { name: "さあ、きめよう！" }).click();
  await page.getByRole("link", { name: "わたしの意見を入力" }).click();

  const client = clientForTokens({ shareToken: created.shareToken });
  const { data: candidate } = await client
    .from("candidates")
    .select("id")
    .eq("event_id", created.eventId)
    .eq("title", candidateTitle)
    .single<{ id: string }>();

  const returningContext = await browser.newContext();
  let releaseOwnerSession!: () => void;
  const ownerSessionRelease = new Promise<void>((resolve) => {
    releaseOwnerSession = resolve;
  });
  let confirmOwnerSessionStarted!: () => void;
  const ownerSessionStarted = new Promise<void>((resolve) => {
    confirmOwnerSessionStarted = resolve;
  });
  await returningContext.route("**/api/owner-session/**", async (route) => {
    confirmOwnerSessionStarted();
    await ownerSessionRelease;
    await route.continue();
  });
  const returningPage = await returningContext.newPage();
  await returningPage.goto(created.ownerUrl);
  await ownerSessionStarted;
  await expect(returningPage.getByRole("heading", { name: "お名前を選んで判断" })).toBeVisible();
  const candidateName = returningPage
    .getByRole("table", { name: "候補のまとめ" })
    .locator(".dashboard-summary-name a")
    .filter({ hasText: candidateTitle });
  const candidateHref = `/e/${created.shareToken}/c/${candidate!.id}`;
  await expect(candidateName).toHaveAttribute("aria-disabled", "true");
  expect(await candidateName.getAttribute("href")).toBeNull();
  await expect(
    returningPage
      .getByRole("table", { name: "候補のまとめ" })
      .getByRole("link", { name: candidateTitle, exact: true })
  ).toHaveCount(0);
  await candidateName.click({ force: true });
  await candidateName.focus();
  await candidateName.press("Enter");
  await candidateName.click({ button: "middle", force: true });
  await expect(returningPage).toHaveURL(created.ownerUrl);

  const ownerSessionResponse = returningPage.waitForResponse(
    (response) => response.url().includes("/api/owner-session/")
  );
  releaseOwnerSession();
  expect((await ownerSessionResponse).ok()).toBe(true);
  await ownerCookie(returningContext, created.shareToken);
  const ownerEditButton = returningPage.getByRole("button", { name: "直す" });
  await expect(ownerEditButton).toBeVisible();
  await expect(ownerEditButton).toBeEnabled();
  await expect(candidateName).not.toHaveAttribute("aria-disabled", "true");
  await expect(candidateName).toHaveAttribute("href", candidateHref);
  await candidateName.click();

  await expect(returningPage).toHaveURL(
    new RegExp(`/e/${created.shareToken}/c/[^/]+$`)
  );
  const detailActions = returningPage.locator(".candidate-detail-action-bar");
  await expect(detailActions).toBeVisible();
  await expect(returningPage.getByText("お名前を選んで判断", { exact: true })).toBeVisible();
  await expect(returningPage.getByRole("button", { name: "判断者名の変更／削除" })).toBeDisabled();
  const positiveButton = detailActions.getByRole("button", {
    name: `${candidateTitle}を○に評価`
  });
  await positiveButton.click();
  const nameDialog = returningPage
    .getByRole("dialog")
    .filter({ has: returningPage.getByRole("heading", { name: "あなたのお名前" }) });
  await expect(nameDialog).toBeVisible();
  await nameDialog.getByRole("button", { name: participantName, exact: true }).click();
  await expect(positiveButton).toHaveAttribute("aria-pressed", "true");
  await expect(positiveButton).toContainText("1");
  await expect(returningPage.getByText(`${participantName}として判断中`)).toBeVisible();
  await expect(returningPage.getByRole("button", { name: "判断者名の変更／削除" })).toBeEnabled();

  const { data: participant } = await client
    .from("participants")
    .select("id")
    .eq("event_id", created.eventId)
    .eq("display_name", participantName)
    .single<{ id: string }>();
  const { count } = await client
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidate!.id)
    .eq("participant_id", participant!.id)
    .eq("value", "positive");
  expect(count).toBe(1);

  await returningPage.getByRole("link", { name: "一覧に戻る" }).click();
  await expect(returningPage).toHaveURL(
    new RegExp(`/e/${created.shareToken}$`)
  );
  await expect(ownerEditButton).toBeVisible();
  await expect(ownerEditButton).toBeEnabled();

  await returningContext.close();
});

test("keeps the summary in sync after dashboard mutations at both widths", async ({ page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const participantName = `[E2E] 同期回答者 ${unique}`;
  const candidateTitle = `[E2E] 同期候補 ${unique}`;
  const longUrl = `https://example.com/${"mobile-overflow-check-".repeat(10)}${unique}`;
  const created = await createEvent(page, `[E2E] 同期と表示 ${unique}`);
  await createOrSelectParticipant(page, participantName);
  await addCandidate(page, candidateTitle, longUrl);
  await page.getByRole("link", { name: "候補一覧" }).click();

  let row = page
    .getByRole("table", { name: "候補のまとめ" })
    .locator("tbody tr")
    .filter({ hasText: candidateTitle });
  const summaryPositive = row.getByRole("button", { name: `${candidateTitle}を○に評価` });
  await summaryPositive.click();
  await expect(summaryPositive).toHaveAttribute("aria-pressed", "true");
  await expect(summaryPositive).toContainText("1");
  const heartTrigger = row.locator(".dashboard-summary-reaction-trigger.heart");
  await heartTrigger.click();
  const criterionDialog = page.getByRole("dialog", { name: candidateTitle });
  await expect(criterionDialog).not.toContainText("判断基準ごとの❤️・🌀");
  await criterionDialog.getByRole("button", { name: "反応項目の追加" }).click();
  const criterionEditorDialog = page.getByRole("dialog", { name: "❤️／🌀反応項目の編集" });
  await expect(criterionEditorDialog).toBeVisible();
  await criterionEditorDialog.getByRole("button", { name: "価格どう？" }).click();
  await expect(criterionEditorDialog.getByText("価格どう？", { exact: true })).toBeVisible();
  await criterionEditorDialog.getByRole("button", { name: "反応項目の編集を閉じる" }).click();
  await heartTrigger.click();
  await expect(page.getByRole("dialog", { name: candidateTitle }).getByText("価格どう？", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "反応入力を閉じる" }).click();
  await heartTrigger.click();
  const reopenedCriterionDialog = page.getByRole("dialog", { name: candidateTitle });
  const heartOption = reopenedCriterionDialog.getByRole("button", { name: "興味ある？にハート" });
  await expect(heartOption).toHaveAttribute("aria-pressed", "false");
  await heartOption.click();
  await expect(heartOption).toHaveAttribute("aria-pressed", "true");
  await expect(heartOption).toContainText("1");
  const concernOption = reopenedCriterionDialog.getByRole("button", { name: "興味ある？に気になる" });
  await expect(concernOption).toHaveAttribute("aria-pressed", "false");
  await concernOption.click();
  await expect(concernOption).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "反応入力を閉じる" }).click();
  await expect(heartTrigger).toHaveText("❤️1");

  const concernTrigger = row.locator(".dashboard-summary-reaction-trigger.concern");
  await expect(concernTrigger).toHaveText("🌀1");
  await expect(row).toHaveAttribute("data-decision-state", "clear");
  await expect(page.locator(".candidate-summary-card")).toHaveCount(0);

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileIdentityBar = page.locator(".dashboard-identity-bar");
  const mobileIdentityBox = await mobileIdentityBar.boundingBox();
  const mobileChangeButton = mobileIdentityBar.getByRole("button", { name: "変更" });
  const mobileChangeButtonBox = await mobileChangeButton.boundingBox();
  const mobileTableBox = await page
    .getByRole("table", { name: "候補のまとめ" })
    .boundingBox();
  await expect(mobileChangeButton).toHaveClass("quiet-edit-button");
  expect(mobileIdentityBox).not.toBeNull();
  expect(mobileChangeButtonBox).not.toBeNull();
  expect(mobileTableBox).not.toBeNull();
  expect(
    Math.abs(
      mobileIdentityBox!.x + mobileIdentityBox!.width
        - (mobileChangeButtonBox!.x + mobileChangeButtonBox!.width)
    )
  ).toBeLessThan(2);
  expect(mobileTableBox!.y).toBeGreaterThanOrEqual(
    mobileIdentityBox!.y + mobileIdentityBox!.height - 1
  );
  row = page
    .getByRole("table", { name: "候補のまとめ" })
    .locator("tbody tr")
    .filter({ hasText: candidateTitle });
  const mobileWrapper = await page
    .locator(".dashboard-summary-table-wrapper")
    .boundingBox();
  const mobileRow = await row.boundingBox();
  const mobileCells = {
    name: await row.locator(".dashboard-summary-name").boundingBox(),
    url: await row.locator(".dashboard-summary-url").boundingBox(),
    evaluation: await row.locator(".dashboard-summary-evaluation").boundingBox(),
    heart: await row.locator(".dashboard-summary-total").nth(0).boundingBox(),
    concern: await row.locator(".dashboard-summary-total").nth(1).boundingBox()
  };
  expect(mobileWrapper).not.toBeNull();
  expect(mobileRow).not.toBeNull();
  expect(mobileRow!.width).toBeGreaterThanOrEqual(mobileWrapper!.width - 2);
  expect(Object.values(mobileCells).every(Boolean)).toBe(true);
  expect(mobileCells.url!.y).toBeGreaterThanOrEqual(
    mobileCells.name!.y + mobileCells.name!.height - 1
  );
  expect(mobileCells.evaluation!.y).toBeGreaterThanOrEqual(
    mobileCells.url!.y + mobileCells.url!.height - 1
  );
  expect(Math.abs(mobileCells.evaluation!.y - mobileCells.heart!.y)).toBeLessThan(2);
  expect(Math.abs(mobileCells.heart!.y - mobileCells.concern!.y)).toBeLessThan(2);
  await expectNoHorizontalOverflow(page);
  await expect
    .poll(() =>
      page.locator(".dashboard-summary-table-wrapper").evaluate(
        (element) => element.scrollWidth <= element.clientWidth
      )
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-summary-and-back-nav-mobile.png",
    fullPage: true
  });

  await page.setViewportSize({ width: 1366, height: 768 });
  const desktopIdentityBox = await page.locator(".dashboard-identity-bar").boundingBox();
  const desktopTableBox = await page
    .getByRole("table", { name: "候補のまとめ" })
    .boundingBox();
  expect(desktopIdentityBox).not.toBeNull();
  expect(desktopTableBox).not.toBeNull();
  expect(desktopTableBox!.y).toBeGreaterThanOrEqual(
    desktopIdentityBox!.y + desktopIdentityBox!.height - 1
  );
  await expect(page.getByRole("table", { name: "候補のまとめ" }).getByRole("columnheader")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: "test-results/dashboard-summary-and-back-nav-desktop.png",
    fullPage: true
  });
  await expect(page).toHaveURL(created.shareUrl);
});
