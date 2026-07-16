import { expect, test } from "@playwright/test";

import {
  addCandidate,
  clientForTokens,
  createEvent,
  createOrSelectParticipant,
  expectNoHorizontalOverflow,
  hasSupabaseEnv
} from "./helpers";

test("selects respondent rows and manages dashboard candidates", async ({ browser, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const ownerName = `[E2E] 田中 ${unique}`;
  const created = await createEvent(page, `[E2E] 候補管理 ${unique}`);

  await page.setViewportSize({ width: 1366, height: 768 });
  const candidateForm = page.locator("form.candidate-add-form");
  const startButton = page.getByRole("button", { name: "さあ、きめよう！" });
  await expect(startButton).toBeDisabled();
  const inputHeights = await Promise.all([
    page.getByLabel("直接入力").evaluate((input) => input.getBoundingClientRect().height),
    candidateForm.getByLabel("候補名").evaluate((input) => input.getBoundingClientRect().height),
    candidateForm.getByLabel("リンク").evaluate((input) => input.getBoundingClientRect().height)
  ]);
  expect(new Set(inputHeights.map((height) => Math.round(height))).size).toBe(1);
  const desktopCandidateBox = await candidateForm.getByLabel("候補名").boundingBox();
  const desktopLinkBox = await candidateForm.getByLabel("リンク").boundingBox();
  const desktopAddBox = await candidateForm.getByRole("button", { name: "追加" }).boundingBox();
  expect(desktopCandidateBox).not.toBeNull();
  expect(desktopLinkBox).not.toBeNull();
  expect(desktopAddBox).not.toBeNull();
  expect(desktopLinkBox!.y).toBeGreaterThan(desktopCandidateBox!.y + desktopCandidateBox!.height);
  expect(desktopAddBox!.y).toBeGreaterThan(desktopLinkBox!.y + desktopLinkBox!.height);
  expect(Math.abs(desktopAddBox!.x - desktopCandidateBox!.x)).toBeLessThan(2);
  expect(Math.abs(desktopAddBox!.width - desktopCandidateBox!.width)).toBeLessThan(2);
  await candidateForm.getByRole("button", { name: "追加" }).click();
  await expect(page.locator(".form-message.error")).toContainText(
    "候補名かリンクのどちらかを入力してください。"
  );
  const unownedCandidate = `[E2E] 提案者なし ${unique}`;
  await addCandidate(page, unownedCandidate);
  const preNameClient = clientForTokens({ shareToken: created.shareToken });
  const [{ count: preNameParticipants }, { data: unownedRow }] = await Promise.all([
    preNameClient.from("participants").select("id", { count: "exact", head: true }).eq("event_id", created.eventId),
    preNameClient.from("candidates").select("created_by").eq("event_id", created.eventId).eq("title", unownedCandidate).single<{ created_by: string | null }>()
  ]);
  expect(preNameParticipants).toBe(0);
  expect(unownedRow!.created_by).toBeNull();
  const addedCandidates = page.locator(".setup-added-candidates");
  await expect(addedCandidates.getByRole("heading", { name: "追加した候補" })).toBeVisible();
  await expect(addedCandidates.getByText(unownedCandidate, { exact: true })).toBeVisible();
  await expect(addedCandidates.getByText("追加済み", { exact: true })).toHaveCount(1);

  const urlOnlyCandidate = `https://example.com/setup-${unique}`;
  await candidateForm.getByLabel("リンク").fill(urlOnlyCandidate);
  await candidateForm.getByRole("button", { name: "追加" }).click();
  await expect(addedCandidates.getByText(urlOnlyCandidate, { exact: true })).toBeVisible();
  await expect(addedCandidates.getByText("追加済み", { exact: true })).toHaveCount(2);
  await expect(startButton).toBeDisabled();

  const existingContext = await browser.newContext();
  const existingPage = await existingContext.newPage();
  await existingPage.goto(created.shareUrl);
  await createOrSelectParticipant(existingPage, ownerName);
  await existingContext.close();

  const firstCandidate = `[E2E] 川沿いカフェ ${unique}`;
  const selectedName = `[E2E] 田中2 ${unique}`;
  const firstCandidateTitleInput = candidateForm.getByLabel("候補名");
  await firstCandidateTitleInput.fill(firstCandidate);
  await candidateForm.getByLabel("リンク").fill(`https://example.com/cafe-${unique}`);
  await page.getByLabel("直接入力").fill(ownerName);
  await candidateForm.getByRole("button", { name: "追加" }).click();
  await expect(page.getByRole("dialog")).toContainText(`「${ownerName}」はすでにあります`);
  await page.getByRole("button", { name: "別の人です" }).click();
  await expect(page.locator(".respondent-selector .form-message.error")).toContainText(
    "別の名前を入力してください。"
  );
  await page.getByLabel("直接入力").fill(selectedName);
  await page.getByLabel("直接入力").press("Enter");
  await expect(firstCandidateTitleInput).toHaveValue("");
  const titledCandidateRow = addedCandidates.locator("li").filter({ hasText: firstCandidate });
  await expect(titledCandidateRow).toContainText(firstCandidate);
  await expect(titledCandidateRow).not.toContainText(`https://example.com/cafe-${unique}`);
  await expect(addedCandidates.getByText("追加済み", { exact: true })).toHaveCount(3);
  await expect(startButton).toBeEnabled();

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileCandidateBox = await candidateForm.getByLabel("候補名").boundingBox();
  const mobileLinkBox = await candidateForm.getByLabel("リンク").boundingBox();
  const mobileAddBox = await candidateForm.getByRole("button", { name: "追加" }).boundingBox();
  expect(mobileCandidateBox).not.toBeNull();
  expect(mobileLinkBox).not.toBeNull();
  expect(mobileAddBox).not.toBeNull();
  expect(mobileLinkBox!.y).toBeGreaterThan(mobileCandidateBox!.y + mobileCandidateBox!.height);
  expect(mobileAddBox!.y).toBeGreaterThan(mobileLinkBox!.y + mobileLinkBox!.height);
  expect(Math.abs(mobileAddBox!.x - mobileCandidateBox!.x)).toBeLessThan(2);
  expect(Math.abs(mobileAddBox!.width - mobileCandidateBox!.width)).toBeLessThan(2);
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await startButton.click();
  const setupShareStep = page.locator(".setup-share-step");
  await expect(setupShareStep.getByRole("heading", { name: "みんなに送るリンク" })).toBeVisible();
  const setupShareCopyButton = setupShareStep.getByRole("button", { name: "コピー" });
  await expect(setupShareCopyButton).toBeVisible();
  await expect(setupShareCopyButton).toHaveClass(/share-copy-button/);
  const opinionLink = setupShareStep.getByRole("link", { name: "わたしの意見を入力" });
  await expect(opinionLink).toHaveAttribute("href", created.ownerUrl);
  await opinionLink.click();
  await expect(page).toHaveURL(created.ownerUrl);
  await expect(page.getByRole("heading", { name: `${selectedName}として判断中` })).toBeVisible();
  await expect(page.getByText("いまの回答者")).toHaveCount(0);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.getByRole("heading", { name: "候補の追加" })).toBeVisible();
  const dashboardCandidateForm = page.locator("form.candidate-add-form");
  const dashboardCandidateBox = await dashboardCandidateForm.getByLabel("候補名").boundingBox();
  const dashboardLinkBox = await dashboardCandidateForm.getByLabel("リンク").boundingBox();
  const dashboardAddBox = await dashboardCandidateForm.getByRole("button", { name: "追加" }).boundingBox();
  expect(dashboardCandidateBox).not.toBeNull();
  expect(dashboardLinkBox).not.toBeNull();
  expect(dashboardAddBox).not.toBeNull();
  expect(dashboardLinkBox!.y).toBeGreaterThan(
    dashboardCandidateBox!.y + dashboardCandidateBox!.height
  );
  expect(dashboardAddBox!.y).toBeGreaterThan(dashboardLinkBox!.y + dashboardLinkBox!.height);
  expect(Math.abs(dashboardAddBox!.x - dashboardCandidateBox!.x)).toBeLessThan(2);
  expect(Math.abs(dashboardAddBox!.width - dashboardCandidateBox!.width)).toBeLessThan(2);
  const sharingSection = page.locator(".sharing-section");
  await expect(sharingSection.getByRole("heading", { name: "URLを送る" })).toBeVisible();
  await expect(sharingSection.getByText("みんなにリンクを送って、決めていきましょう。メールやLINEなど、なんでもいいよ。あなた専用リンクでは、きめることと、つたえておきたいことを編集できます。")).toBeVisible();
  const dashboardCopyButtons = sharingSection.getByRole("button", {
    name: "コピー",
    exact: true
  });
  await expect(dashboardCopyButtons).toHaveCount(2);
  await expect(sharingSection.locator("button.share-copy-button")).toHaveText("コピー");
  await expect(
    page.getByRole("table", { name: "候補のまとめ" }).getByRole("link", {
      name: firstCandidate,
      exact: true
    })
  ).toBeVisible();

  const client = clientForTokens({ shareToken: created.shareToken });
  const { data: ownerParticipant } = await client
    .from("participants")
    .select("id")
    .eq("event_id", created.eventId)
    .eq("display_name", selectedName)
    .single<{ id: string }>();
  const { data: firstRow } = await client
    .from("candidates")
    .select("id,created_by")
    .eq("event_id", created.eventId)
    .eq("title", firstCandidate)
    .single<{ id: string; created_by: string | null }>();
  expect(firstRow!.created_by).toBe(ownerParticipant!.id);

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(created.shareUrl);
  await guestPage.getByRole("button", { name: selectedName, exact: true }).click();
  await expect(guestPage.getByRole("heading", { name: `${selectedName}として判断中` })).toBeVisible();
  await expect(guestPage.getByText("いまの回答者")).toHaveCount(0);
  await expect(guestPage.getByRole("heading", { name: "判断基準" })).toHaveCount(0);
  await expect(guestPage.locator(".candidate-summary-card")).toHaveCount(0);
  const firstSummaryRow = guestPage
    .getByRole("table", { name: "候補のまとめ" })
    .locator("tbody tr")
    .filter({ hasText: firstCandidate });
  const positiveButton = firstSummaryRow.getByRole("button", {
    name: `${firstCandidate}を○に評価`
  });
  await positiveButton.click();
  await expect(positiveButton).toHaveAttribute("aria-pressed", "true");
  await firstSummaryRow.locator(".dashboard-summary-reaction-trigger.heart").click();
  const criterionDialog = guestPage.getByRole("dialog", { name: firstCandidate });
  const heartButton = criterionDialog.getByRole("button", { name: "興味ある？にハート" });
  const concernButton = criterionDialog.getByRole("button", { name: "興味ある？に気になる" });
  await heartButton.click();
  await expect(heartButton).toHaveAttribute("aria-pressed", "true");
  await concernButton.click();
  await expect(concernButton).toHaveAttribute("aria-pressed", "true");
  await guestPage.getByRole("button", { name: "反応入力を閉じる" }).click();

  const secondCandidate = `[E2E] 公園 ${unique}`;
  await addCandidate(guestPage, secondCandidate);
  const guestCandidateTable = guestPage.getByRole("table", { name: "候補のまとめ" });
  await expect(
    guestCandidateTable.getByRole("link", { name: secondCandidate, exact: true })
  ).toBeVisible();
  await guestCandidateTable.getByRole("link", { name: firstCandidate, exact: true }).click();
  await expect(guestPage).toHaveURL(new RegExp(`/e/${created.shareToken}/c/${firstRow!.id}$`));
  await expect(guestPage.getByRole("button", { name: "❤️／🌀反応項目の編集" })).toBeVisible();
  await expect(guestPage.getByText(`${selectedName}として判断中`)).toBeVisible();
  await expect(guestPage.getByText(/時間以内に追加/)).toBeVisible();

  const candidateInfoTrigger = guestPage.getByRole("button", { name: "候補内容の編集" });
  await expect(candidateInfoTrigger).toHaveAttribute("aria-expanded", "false");
  await candidateInfoTrigger.click();
  await expect(candidateInfoTrigger).toHaveAttribute("aria-expanded", "true");
  const editor = guestPage.locator(".candidate-info-editor");
  const updatedTitle = `${firstCandidate} 更新`;
  await editor.getByLabel("候補名").fill(updatedTitle);
  await editor.getByRole("button", { name: "変更" }).first().click();
  await expect(guestPage.getByRole("dialog")).toContainText("候補名を変更しますか？");
  await guestPage.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(guestPage.getByRole("heading", { name: updatedTitle })).toBeVisible();

  await editor.getByLabel("リンク").fill(`https://example.com/updated-${unique}`);
  await editor.getByRole("button", { name: "変更" }).nth(1).click();
  await expect(guestPage.getByRole("dialog")).toContainText("リンクを変更しますか？");
  await guestPage.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(guestPage.getByRole("link", { name: `https://example.com/updated-${unique}` })).toBeVisible();

  await editor.getByLabel("提案者").selectOption("");
  await editor.getByRole("button", { name: "変更" }).nth(2).click();
  await expect(guestPage.getByRole("dialog")).toContainText("提案者を変更しますか？");
  await guestPage.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(guestPage.getByText(/提案者 ー/)).toBeVisible();

  const duplicateContext = await browser.newContext();
  const duplicatePage = await duplicateContext.newPage();
  await duplicatePage.goto(created.shareUrl);
  await duplicatePage.getByLabel("直接入力").fill(selectedName);
  await duplicatePage.getByLabel("直接入力").press("Enter");
  await expect(duplicatePage.getByRole("dialog")).toContainText(`「${selectedName}」はすでにあります`);
  await duplicatePage.getByRole("button", { name: "同じ人です" }).click();
  await expect(duplicatePage.getByRole("heading", { name: `${selectedName}として判断中` })).toBeVisible();

  await guestPage.goto(created.shareUrl);
  await guestPage.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(guestPage);
  await guestPage.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
  await guestPage.setViewportSize({ width: 1366, height: 768 });
  await expectNoHorizontalOverflow(guestPage);
  await guestPage.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });

  await guestPage
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: secondCandidate, exact: true })
    .click();
  await guestPage.getByRole("button", { name: "候補内容の編集" }).click();
  await guestPage.getByRole("button", { name: "候補を削除" }).click();
  await expect(guestPage.getByRole("dialog")).toContainText("この候補を削除しますか？");
  await guestPage.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(guestPage.getByRole("dialog")).toContainText("本当によろしいですか？");
  await guestPage.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(guestPage).toHaveURL(new RegExp(`/e/${created.shareToken}$`));
  await expect(guestPage.getByRole("link", { name: secondCandidate, exact: true })).toHaveCount(0);

  await guestContext.close();
  await duplicateContext.close();
});
