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

  const candidateForm = page.locator("form.candidate-add-form");
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

  const existingContext = await browser.newContext();
  const existingPage = await existingContext.newPage();
  await existingPage.goto(created.shareUrl);
  await createOrSelectParticipant(existingPage, ownerName);
  await existingContext.close();

  const firstCandidate = `[E2E] 川沿いカフェ ${unique}`;
  const selectedName = `[E2E] 田中2 ${unique}`;
  const firstCandidateTitleInput = candidateForm.getByLabel("候補");
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
  await page.getByRole("link", { name: "候補一覧" }).click();
  await expect(page.getByRole("link", { name: firstCandidate, exact: true })).toBeVisible();

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
  await expect(guestPage.getByRole("heading", { name: "候補", exact: true })).toBeVisible();
  await expect(guestPage.getByRole("heading", { name: "判断基準" })).toHaveCount(0);
  const firstCard = guestPage.locator(".candidate-summary-card").filter({
    hasText: firstCandidate
  });
  await expect(firstCard.getByText("⭕️")).toBeVisible();
  await expect(firstCard.getByText("➖")).toBeVisible();
  await expect(firstCard.getByText("❌")).toBeVisible();
  await expect(firstCard.getByText(/時間以内に追加/)).toBeVisible();

  const secondCandidate = `[E2E] 公園 ${unique}`;
  await addCandidate(guestPage, secondCandidate);
  await expect(guestPage.getByRole("link", { name: secondCandidate, exact: true })).toBeVisible();
  await guestPage.getByRole("link", { name: firstCandidate, exact: true }).click();
  await expect(guestPage).toHaveURL(new RegExp(`/e/${created.shareToken}/c/${firstRow!.id}$`));
  await expect(guestPage.getByRole("heading", { name: "判断基準" })).toBeVisible();
  await expect(guestPage.getByText(`${selectedName}として判断中`)).toBeVisible();

  await guestPage.getByRole("button", { name: "候補情報を編集" }).click();
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
  await expect(duplicatePage.getByRole("heading", { name: "候補", exact: true })).toBeVisible();

  await guestPage.goto(created.shareUrl);
  await guestPage.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(guestPage);
  await guestPage.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
  await guestPage.setViewportSize({ width: 1366, height: 768 });
  await expectNoHorizontalOverflow(guestPage);
  await guestPage.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });

  await guestPage.getByRole("link", { name: secondCandidate, exact: true }).click();
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
