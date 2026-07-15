import { expect, test } from "@playwright/test";

import {
  addCandidate,
  clientForTokens,
  createEvent,
  createOrSelectParticipant,
  expectNoHorizontalOverflow,
  hasSupabaseEnv
} from "./helpers";

test("edits votes, criterion feedback, comments, names, and cascades", async ({ browser, page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const firstName = `[E2E] 鈴木 ${unique}`;
  const secondName = `[E2E] 佐藤 ${unique}`;
  const created = await createEvent(page, `[E2E] 意見可視化 ${unique}`);
  await createOrSelectParticipant(page, firstName);
  const candidateTitle = `[E2E] 温泉 ${unique}`;
  await addCandidate(page, candidateTitle);
  await page.getByRole("link", { name: "候補一覧" }).click();
  const candidateTable = page.getByRole("table", { name: "候補のまとめ" });
  await expect(candidateTable.getByRole("link", { name: candidateTitle })).toBeVisible();

  const client = clientForTokens({ shareToken: created.shareToken });
  const { data: candidate } = await client.from("candidates").select("id").eq("title", candidateTitle).single<{ id: string }>();
  const { data: criterion } = await client.from("criteria").select("id").eq("event_id", created.eventId).eq("label", "興味ある？").single<{ id: string }>();
  const { data: firstParticipant } = await client.from("participants").select("id").eq("event_id", created.eventId).eq("display_name", firstName).single<{ id: string }>();

  await candidateTable.getByRole("link", { name: candidateTitle }).click();
  await page.evaluate(() => {
    (window as typeof window & { __e2eSentinel?: string }).__e2eSentinel = "alive";
  });
  const detailHeader = page.locator(".candidate-detail-header");
  const positiveButton = detailHeader.getByRole("button", { name: `${candidateTitle}を○に評価` });
  await positiveButton.click();
  await expect(positiveButton).toHaveAttribute("aria-pressed", "true");
  await detailHeader.locator(".dashboard-summary-reaction-trigger.heart").click();
  const criterionDialog = page.getByRole("dialog", { name: candidateTitle });
  await criterionDialog.getByRole("button", { name: "興味ある？にハート" }).click();
  await criterionDialog.getByRole("button", { name: "興味ある？に気になる" }).click();
  await page.getByRole("button", { name: "判断基準を閉じる" }).click();
  const commentComposer = page.locator(".candidate-comment-composer");
  const commentTextbox = commentComposer.getByRole("textbox", { name: "コメント" });
  const commentSaveButton = commentComposer.getByRole("button", { name: "保存" });
  async function saveCommentAndWait(value: string) {
    await commentTextbox.fill(value);
    const response = page.waitForResponse((actionResponse) =>
      actionResponse.request().method() === "POST" && Boolean(actionResponse.request().headers()["next-action"])
    );
    await commentSaveButton.click();
    await response;
    await expect(commentSaveButton).toBeEnabled();
    await expect(commentTextbox).toHaveValue(value);
  }
  const comment = `[E2E] とても良さそう ${unique}`;
  await saveCommentAndWait(comment);
  expect(
    await page.evaluate(
      () => (window as typeof window & { __e2eSentinel?: string }).__e2eSentinel
    )
  ).toBe("alive");

  const exact500 = `[E2E]${"あ".repeat(495)}`;
  await saveCommentAndWait(exact500);
  const { data: saved500 } = await client
    .from("comments")
    .select("text")
    .eq("candidate_id", candidate!.id)
    .eq("participant_id", firstParticipant!.id)
    .single<{ text: string }>();
  expect(Array.from(saved500!.text)).toHaveLength(500);
  await saveCommentAndWait(`${exact500}あ`);
  await expect(page.locator(".form-message.error")).toContainText(
    "コメントは500文字以内で入力してください。"
  );
  await saveCommentAndWait(comment);

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto(created.shareUrl);
  await createOrSelectParticipant(secondPage, secondName);
  await secondPage
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: candidateTitle })
    .click();
  const secondHeader = secondPage.locator(".candidate-detail-header");
  await secondHeader.getByRole("button", { name: `${candidateTitle}を×に評価` }).click();
  await secondHeader.locator(".dashboard-summary-reaction-trigger.concern").click();
  await secondPage.getByRole("dialog", { name: candidateTitle }).getByRole("button", { name: "興味ある？に気になる" }).click();
  await secondPage.getByRole("button", { name: "判断基準を閉じる" }).click();

  await page.reload();
  const secondReadonlyRow = page.locator(".respondent-row.readonly").filter({
    hasText: secondName
  });
  const firstReadonlyRow = page.locator(".respondent-row.readonly").filter({
    hasText: firstName
  });
  await expect(secondReadonlyRow).toBeVisible();
  await expect(secondReadonlyRow.locator(".readonly-evaluation")).toHaveText("×");
  await expect(firstReadonlyRow.locator(".readonly-comment")).toHaveText(comment);
  await expect(firstReadonlyRow.locator(".readonly-comment")).toHaveCSS("overflow", "visible");
  await expect(page.locator("button.respondent-row")).toHaveCount(0);

  await page.getByRole("button", { name: "判断基準編集" }).click();
  await page.getByRole("button", { name: "＋ 判断基準" }).click();
  await page.getByRole("button", { name: "価格どう？" }).click();
  await expect(page.getByText("価格どう？", { exact: true })).toBeVisible();
  const priceCriterion = page.locator(".criterion-overview-list > li").filter({ hasText: "価格どう？" });
  await priceCriterion.getByRole("button", { name: "価格どう？のメニュー" }).click();
  const updatedCriterionLabel = `[E2E] 予算どう？ ${unique}`;
  await priceCriterion.getByLabel("判断基準").fill(updatedCriterionLabel);
  await priceCriterion.getByRole("button", { name: "保存" }).click();
  const updatedCriterion = page.locator(".criterion-overview-list > li").filter({
    has: page.getByRole("button", { name: `${updatedCriterionLabel}のメニュー` })
  });
  await expect(updatedCriterion.locator(".criterion-overview > strong")).toHaveText(updatedCriterionLabel);
  await detailHeader.locator(".dashboard-summary-reaction-trigger.heart").click();
  const updatedCriterionDialog = page.getByRole("dialog", { name: candidateTitle });
  await updatedCriterionDialog.getByRole("button", { name: `${updatedCriterionLabel}にハート` }).click();
  await expect(updatedCriterionDialog.getByRole("button", { name: `${updatedCriterionLabel}にハート` })).toHaveAttribute("aria-pressed", "true");
  await updatedCriterionDialog.getByRole("button", { name: `${updatedCriterionLabel}に気になる` }).click();
  await expect(updatedCriterionDialog.getByRole("button", { name: `${updatedCriterionLabel}に気になる` })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "判断基準を閉じる" }).click();
  const { data: updatedCriterionRecord } = await client
    .from("criteria")
    .select("id")
    .eq("event_id", created.eventId)
    .eq("label", updatedCriterionLabel)
    .single<{ id: string }>();
  await updatedCriterion.getByRole("button", { name: `${updatedCriterionLabel}のメニュー` }).click();
  await updatedCriterion.getByRole("button", { name: "削除" }).click();
  await expect(page.getByRole("dialog")).toContainText(`${updatedCriterionLabel}を削除しますか？`);
  await page.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(page.getByRole("dialog")).toContainText("本当によろしいですか？");
  await page.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(updatedCriterion).toHaveCount(0);
  const deletedCriterionFeedback = await Promise.all([
    client.from("reactions").select("id", { count: "exact", head: true }).eq("criterion_id", updatedCriterionRecord!.id),
    client.from("concerns").select("id", { count: "exact", head: true }).eq("criterion_id", updatedCriterionRecord!.id)
  ]);
  expect(deletedCriterionFeedback.map((result) => result.count)).toEqual([0, 0]);

  await page.getByRole("button", { name: "判断者編集" }).click();
  await page.getByRole("button", { name: "名前を変更" }).click();
  const renamed = `${firstName} 更新`;
  await page.getByRole("dialog").getByLabel("新しいお名前").fill(renamed);
  await page.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(page.getByText(`${renamed}として判断中`)).toBeVisible();

  const rawDuplicate = await client.from("votes").insert({ candidate_id: candidate!.id, participant_id: firstParticipant!.id, value: "neutral" });
  expect(rawDuplicate.error?.code).toBe("23505");

  const otherEvent = await createEvent(secondPage, `[E2E] 別イベント ${unique}`);
  const otherClient = clientForTokens({ shareToken: otherEvent.shareToken });
  const { data: otherParticipant } = await otherClient.from("participants").insert({ event_id: otherEvent.eventId, display_name: `[E2E] 別人 ${unique}` }).select("id").single<{ id: string }>();
  const crossEventVote = await client.from("votes").insert({ candidate_id: candidate!.id, participant_id: otherParticipant!.id, value: "positive" });
  expect(crossEventVote.error).not.toBeNull();
  const crossEventConcern = await client.from("concerns").insert({ candidate_id: candidate!.id, participant_id: firstParticipant!.id, criterion_id: (await otherClient.from("criteria").select("id").eq("event_id", otherEvent.eventId).single<{ id: string }>()).data!.id });
  expect(crossEventConcern.error).not.toBeNull();

  const ownerOnly = clientForTokens({ ownerToken: created.ownerToken });
  const ownerMutation = await ownerOnly.from("participants").insert({ event_id: created.eventId, display_name: `[E2E] owner拒否 ${unique}` });
  expect(ownerMutation.error).not.toBeNull();

  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "test-results/candidate-edit-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "test-results/candidate-edit-desktop.png", fullPage: true });

  await page.getByRole("button", { name: "回答者を削除" }).click();
  await expect(page.getByRole("dialog")).toContainText(`${renamed}の回答を削除しますか？`);
  await page.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(page.getByRole("dialog")).toContainText("本当によろしいですか？");
  await page.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(page.getByRole("button", { name: "お名前を選ぶ" })).toBeVisible();
  await expect(page.locator(".respondent-row").filter({ hasText: renamed })).toHaveCount(0);
  const dependentCounts = await Promise.all([
    client.from("votes").select("id", { count: "exact", head: true }).eq("participant_id", firstParticipant!.id),
    client.from("reactions").select("id", { count: "exact", head: true }).eq("participant_id", firstParticipant!.id),
    client.from("concerns").select("id", { count: "exact", head: true }).eq("participant_id", firstParticipant!.id),
    client.from("comments").select("id", { count: "exact", head: true }).eq("participant_id", firstParticipant!.id)
  ]);
  expect(dependentCounts.map((result) => result.count)).toEqual([0, 0, 0, 0]);
  const { data: proposerAfterDelete } = await client.from("candidates").select("created_by").eq("id", candidate!.id).single<{ created_by: string | null }>();
  expect(proposerAfterDelete!.created_by).toBeNull();

  await secondContext.close();
});
