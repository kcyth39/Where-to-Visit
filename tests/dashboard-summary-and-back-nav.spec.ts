import { expect, test, type Page } from "@playwright/test";

import {
  addCandidate,
  clientForTokens,
  createEvent,
  createOrSelectParticipant,
  expectNoHorizontalOverflow,
  hasSupabaseEnv
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

  const current = page.locator(".event-nav-link.is-disabled");
  await expect(current).toHaveText("一覧に戻る");
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(current).not.toHaveAttribute("href");
  await expect(current).not.toHaveAttribute("tabindex");
  await expect(page.getByRole("link", { name: "一覧に戻る" })).toHaveCount(0);
  const dashboardUrl = page.url();
  await current.click();
  await current.dispatchEvent("keydown", { key: "Enter" });
  await current.dispatchEvent("keydown", { key: " " });
  await expect(page).toHaveURL(dashboardUrl);

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

test("renders the read-only summary from existing candidate aggregates", async ({ browser, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const fixture = await createSummaryFixture(page, unique);
  const table = page.getByRole("table", { name: "候補のまとめ" });

  await expect(table.locator("caption")).toHaveText("候補のまとめ");
  await expect(table.getByRole("columnheader")).toHaveText([
    "候補名",
    "リンク",
    "⭕️ ➖ ❌",
    "❤️",
    "🌀"
  ]);
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
  await expect(firstRow.locator(".evaluation-chip.positive")).toContainText("2");
  await expect(firstRow.locator(".evaluation-chip.neutral")).toContainText("1");
  await expect(firstRow.locator(".evaluation-chip.veto")).toContainText("1");
  await expect(firstRow.locator(".dashboard-summary-total").nth(0)).toHaveText("❤️ 2");
  await expect(firstRow.locator(".dashboard-summary-total").nth(1)).toHaveText("🌀 1");
  await expect(firstRow).toHaveAttribute("data-decision-state", "discussion");

  const linkOnlyRow = table.locator("tbody tr").filter({ hasText: "リンク候補" });
  await expect(linkOnlyRow).toHaveAttribute("data-decision-state", "clear");
  await expect(linkOnlyRow).toContainText("有力候補、最多の○かつ×なし");
  const thirdRow = table.locator("tbody tr").filter({ hasText: fixture.thirdTitle });
  await expect(thirdRow).toHaveAttribute("data-decision-state", "none");
  await expect(thirdRow.locator(".dashboard-summary-url")).toHaveText("URLなし");
  await expect(thirdRow.locator(".evaluation-chip.neutral")).toContainText("0");

  for (const row of await table.locator("tbody tr").all()) {
    const candidateName = await row.locator(".dashboard-summary-name a").innerText();
    const card = page.locator(".candidate-summary-card").filter({ hasText: candidateName });
    await expect(card).toHaveAttribute(
      "data-decision-state",
      (await row.getAttribute("data-decision-state"))!
    );
  }

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

test("separates row, candidate link, and external URL navigation", async ({ page }) => {
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

  await firstRow.locator(".dashboard-summary-total").first().click();
  await expect(page).toHaveURL(
    new RegExp(`/e/${fixture.created.shareToken}/c/${fixture.first.id}$`)
  );
  await page.getByRole("link", { name: "一覧に戻る" }).click();

  const candidateLink = page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: fixture.firstTitle, exact: true });
  await candidateLink.focus();
  await candidateLink.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/e/${fixture.created.shareToken}/c/${fixture.first.id}$`)
  );
});

test("keeps summary and card in sync after dashboard mutations at both widths", async ({ page }) => {
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
  const card = page.locator(".candidate-summary-card").filter({ hasText: candidateTitle });
  await card.getByRole("button", { name: "○に評価" }).click();
  await expect(row.locator(".evaluation-chip.positive")).toContainText("1");
  await expect(card.getByRole("button", { name: "○に評価" })).toContainText("1");
  await card.getByRole("button", { name: "興味ある？にハート" }).click();
  await expect(row.locator(".dashboard-summary-total").nth(0)).toHaveText("❤️ 1");
  await card.getByRole("button", { name: "興味ある？に気になる" }).click();
  await expect(row.locator(".dashboard-summary-total").nth(1)).toHaveText("🌀 1");
  await expect(row).toHaveAttribute("data-decision-state", "clear");
  await expect(card).toHaveAttribute("data-decision-state", "clear");

  await page.setViewportSize({ width: 375, height: 812 });
  row = page
    .getByRole("table", { name: "候補のまとめ" })
    .locator("tbody tr")
    .filter({ hasText: candidateTitle });
  const mobileCells = {
    name: await row.locator(".dashboard-summary-name").boundingBox(),
    url: await row.locator(".dashboard-summary-url").boundingBox(),
    evaluation: await row.locator(".dashboard-summary-evaluation").boundingBox(),
    heart: await row.locator(".dashboard-summary-total").nth(0).boundingBox(),
    concern: await row.locator(".dashboard-summary-total").nth(1).boundingBox()
  };
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
  await expect(page.getByRole("table", { name: "候補のまとめ" }).getByRole("columnheader")).toHaveCount(5);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: "test-results/dashboard-summary-and-back-nav-desktop.png",
    fullPage: true
  });
  await expect(page).toHaveURL(created.shareUrl);
});
