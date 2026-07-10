import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function readEnvValue(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  for (const fileName of [".env.local", ".env"]) {
    if (!existsSync(fileName)) continue;
    const line = readFileSync(fileName, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${name}=`));
    const value = line?.slice(name.length + 1).trim();
    if (value) return value;
  }

  return undefined;
}

const supabaseUrl = readEnvValue("SUPABASE_URL");
const supabaseAnonKey = readEnvValue("SUPABASE_ANON_KEY");
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

type AccessTokens = {
  shareToken?: string;
  ownerToken?: string;
  guestToken?: string;
};

function clientForTokens(tokens: AccessTokens) {
  const headers: Record<string, string> = {};
  if (tokens.shareToken) headers["x-share-token"] = tokens.shareToken;
  if (tokens.ownerToken) headers["x-owner-token"] = tokens.ownerToken;
  if (tokens.guestToken) headers["x-guest-token"] = tokens.guestToken;

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers }
  });
}

async function currentGuestToken(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === "kimenosuke_guest_token"
  );
  expect(cookie?.value).toBeTruthy();
  return cookie!.value;
}

async function createEvent(page: Page, title: string, ownerName: string) {
  await page.goto("/");
  await page.getByLabel("お題").fill(title);
  if (ownerName) await page.getByLabel("お名前").fill(ownerName);
  await page.getByRole("button", { name: "きめよう！" }).click();
  await expect(page).toHaveURL(/\/o\/[^/?]+/);

  const ownerUrl = page.url().split("?")[0];
  const ownerToken = new URL(ownerUrl).pathname.split("/").at(-1)!;
  const shareUrl = await page.locator("code").filter({ hasText: "/e/" }).first().textContent();
  expect(shareUrl).toMatch(/\/e\/[A-Za-z0-9_-]+$/);
  const shareToken = new URL(shareUrl!).pathname.split("/").at(-1)!;
  const guestToken = await currentGuestToken(page.context());

  return { ownerUrl, ownerToken, shareUrl: shareUrl!, shareToken, guestToken };
}

async function addCandidate(
  page: Page,
  title: string,
  displayName = ""
): Promise<void> {
  const form = page.locator("form.candidate-form");
  await form.getByLabel("タイトル").fill(title);
  if (displayName) await form.getByLabel("お名前（任意）").fill(displayName);
  const addButton = form.getByRole("button", { name: "追加" });
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await expect(page.getByText(title).first()).toBeVisible();
}

async function eventIdForShareToken(shareToken: string): Promise<string> {
  const client = clientForTokens({ shareToken });
  const { data, error } = await client
    .from("events")
    .select("id")
    .eq("share_token", shareToken)
    .single<{ id: string }>();
  expect(error).toBeNull();
  return data!.id;
}

async function deleteCriterionRow(row: ReturnType<Page["locator"]>) {
  await row.getByRole("button", { name: "消す" }).first().click();
  await row.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(row.locator(".danger-dialog")).toContainText("本当によろしいですか？");
  await row.locator(".danger-dialog").getByRole("button", { name: "消す" }).click();
}

test.describe("Slice 5 criteria, reactions, concerns, and comments", () => {
  test.describe.configure({ timeout: 120_000 });
  test.skip(
    !hasSupabaseEnv,
    "Supabase env or Slice 5 migration is not prepared; Slice 5 E2E is pending."
  );

  test("seeds and jointly manages ordered criteria without forced participation", async ({
    browser,
    page
  }) => {
    const unique = Date.now().toString();
    const ownerName = `[E2E] 判断基準オーナー ${unique}`;
    const event = await createEvent(page, `[E2E] 判断基準 ${unique}`, ownerName);
    const eventId = await eventIdForShareToken(event.shareToken);
    const ownerClient = clientForTokens({
      shareToken: event.shareToken,
      guestToken: event.guestToken
    });

    const { data: seed } = await ownerClient
      .from("criteria")
      .select("id,label,source,created_by")
      .eq("event_id", eventId)
      .single<{
        id: string;
        label: string;
        source: string;
        created_by: string | null;
      }>();
    expect(seed).toMatchObject({
      label: "興味ある？",
      source: "default",
      created_by: null
    });
    await expect(page.locator(".criterion-row strong")).toHaveText(["興味ある？"]);

    await expect(page.getByRole("button", { name: "価格どう？" })).toBeEnabled();
    await page.getByRole("button", { name: "価格どう？" }).click();
    await expect(page.locator(".criterion-row strong")).toContainText(["興味ある？", "価格どう？"]);

    const { data: ownerParticipant } = await ownerClient
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("display_name", ownerName)
      .single<{ id: string }>();
    const { data: ownerCriterion } = await ownerClient
      .from("criteria")
      .select("created_by")
      .eq("event_id", eventId)
      .eq("label", "価格どう？")
      .single<{ created_by: string | null }>();
    expect(ownerCriterion?.created_by).toBe(ownerParticipant?.id);

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(event.shareUrl);
    const { count: participantCountBefore } = await ownerClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    const customInput = guestPage.getByLabel("自由記述の判断基準");
    const customLabel = `[E2E] 基準A ${unique}`;
    await customInput.fill(`  ${customLabel}  `);
    await guestPage.locator(".criterion-add-form").getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByText(customLabel, { exact: true })).toBeVisible();

    const { count: participantCountAfter } = await ownerClient
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    expect(participantCountAfter).toBe(participantCountBefore);
    const { data: anonymousCriterion } = await ownerClient
      .from("criteria")
      .select("created_by")
      .eq("event_id", eventId)
      .eq("label", customLabel)
      .single<{ created_by: string | null }>();
    expect(anonymousCriterion?.created_by).toBeNull();

    await customInput.fill(customLabel);
    await guestPage.locator(".criterion-add-form").getByRole("button", { name: "追加" }).click();
    await expect(guestPage.locator(".criterion-row strong").filter({ hasText: customLabel })).toHaveCount(2);

    await customInput.fill("  雰囲気どう？  ");
    await guestPage.locator(".criterion-add-form").getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByRole("button", { name: "雰囲気どう？" })).toHaveCount(0);

    const { data: orderedCriteria } = await ownerClient
      .from("criteria")
      .select("label")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<Array<{ label: string }>>();
    await expect(guestPage.locator(".criterion-row strong")).toHaveText(
      orderedCriteria!.map((criterion) => criterion.label)
    );

    const firstCustomRow = guestPage.locator(".criterion-item").filter({ hasText: customLabel }).first();
    const positionBefore = await firstCustomRow.evaluate((element) =>
      Array.from(element.parentElement!.children).indexOf(element)
    );
    await firstCustomRow.getByRole("button", { name: "直す" }).click();
    const editedLabel = `[E2E] 基準A変更 ${unique}`;
    await firstCustomRow.getByLabel(`${customLabel}を編集`).fill(editedLabel);
    await guestPage.evaluate(() => {
      (window as Window & { __slice5Sentinel?: string }).__slice5Sentinel = "kept";
    });
    await firstCustomRow.getByRole("button", { name: "変更" }).click();
    await expect(firstCustomRow.getByRole("dialog")).toContainText("変更します、よろしいですか？");
    await firstCustomRow.getByRole("dialog").getByRole("button", { name: "変更" }).click();
    await expect(guestPage.getByText(editedLabel, { exact: true })).toBeVisible();
    expect(
      await guestPage.evaluate(
        () => (window as Window & { __slice5Sentinel?: string }).__slice5Sentinel
      )
    ).toBe("kept");
    const positionAfter = await guestPage
      .locator(".criterion-item")
      .filter({ hasText: editedLabel })
      .evaluate((element) => Array.from(element.parentElement!.children).indexOf(element));
    expect(positionAfter).toBe(positionBefore);

    await customInput.fill("あ".repeat(61));
    const countBeforeFailure = await guestPage.locator(".criterion-item").count();
    await guestPage.locator(".criterion-add-form").getByRole("button", { name: "追加" }).click();
    await expect(guestPage.locator(".form-message.error")).toContainText(
      "判断基準は1〜60文字で入力してください。"
    );
    await expect(guestPage.locator(".criterion-item")).toHaveCount(countBeforeFailure);
    await customInput.fill("   ");
    await guestPage.locator(".criterion-add-form").getByRole("button", { name: "追加" }).click();
    await expect(guestPage.locator(".form-message.error")).toContainText(
      "判断基準は1〜60文字で入力してください。"
    );
    await expect(guestPage.locator(".criterion-item")).toHaveCount(countBeforeFailure);

    const atmosphereRow = guestPage.locator(".criterion-item").filter({ hasText: "雰囲気どう？" });
    await deleteCriterionRow(atmosphereRow);
    await expect(guestPage.getByRole("button", { name: "雰囲気どう？" })).toBeVisible();

    while ((await guestPage.locator(".criterion-item").count()) > 0) {
      const countBeforeDelete = await guestPage.locator(".criterion-item").count();
      await deleteCriterionRow(guestPage.locator(".criterion-item").first());
      await expect(guestPage.locator(".criterion-item")).toHaveCount(
        countBeforeDelete - 1
      );
    }
    await expect(guestPage.locator(".criterion-item")).toHaveCount(0);
    await expect(guestPage.getByRole("button", { name: "価格どう？" })).toBeVisible();

    await guestPage.reload();
    await expect(guestPage.locator(".criterion-item")).toHaveCount(0);
    await expect(guestPage.getByText(/並び替え/)).toHaveCount(0);
    await guestContext.close();
  });

  test("updates reactions, concerns, and comments immediately with visible participants", async ({
    browser,
    page
  }) => {
    const unique = Date.now().toString();
    const event = await createEvent(page, `[E2E] 反応コメント ${unique}`, "");
    const eventId = await eventIdForShareToken(event.shareToken);
    const client = clientForTokens({ shareToken: event.shareToken });

    const guestAContext = await browser.newContext();
    const guestAPage = await guestAContext.newPage();
    await guestAPage.goto(event.shareUrl);
    const guestAName = `[E2E] 参加者A ${unique}`;
    const candidateTitle = `[E2E] 反応候補 ${unique}`;
    await addCandidate(guestAPage, candidateTitle, guestAName);

    const guestBContext = await browser.newContext();
    const guestBPage = await guestBContext.newPage();
    await guestBPage.goto(event.shareUrl);
    const guestBName = `[E2E] 参加者B ${unique}`;
    await addCandidate(guestBPage, `[E2E] B候補 ${unique}`, guestBName);

    await guestAPage.reload();
    let candidate = guestAPage.locator(".candidate-item").filter({ hasText: candidateTitle });
    await guestAPage.evaluate(() => {
      (window as Window & { __slice5Sentinel?: string }).__slice5Sentinel = "reaction";
    });
    await candidate.getByRole("button", { name: "興味ある？ ❤️" }).click();
    await expect(candidate.getByRole("button", { name: "興味ある？ ❤️" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(candidate.getByRole("button", { name: "興味ある？を付けた人を見る" })).toHaveText("1人");
    expect(
      await guestAPage.evaluate(
        () => (window as Window & { __slice5Sentinel?: string }).__slice5Sentinel
      )
    ).toBe("reaction");

    await guestBPage.reload();
    candidate = guestBPage.locator(".candidate-item").filter({ hasText: candidateTitle });
    await candidate.getByRole("button", { name: "興味ある？ ❤️" }).click();
    await expect(candidate.getByRole("button", { name: "興味ある？を付けた人を見る" })).toHaveText("2人");
    await candidate.getByRole("button", { name: "🌀 気になる" }).click();
    await expect(candidate.getByRole("button", { name: "🌀 気になる" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await guestAPage.reload();
    candidate = guestAPage.locator(".candidate-item").filter({ hasText: candidateTitle });
    await candidate.getByRole("button", { name: "興味ある？を付けた人を見る" }).click();
    const guestBReaction = candidate
      .locator(".feedback-people-list li")
      .filter({ hasText: guestBName });
    await guestBReaction.getByRole("button", { name: "外す" }).click();
    await expect(candidate.getByRole("button", { name: "興味ある？を付けた人を見る" })).toHaveText("1人");

    await candidate.getByRole("button", { name: "🌀 気になる" }).click();
    await expect(candidate.getByRole("button", { name: "気になるを付けた人を見る" })).toHaveText("2人");
    await candidate.getByRole("button", { name: "気になるを付けた人を見る" }).click();
    const guestBConcern = candidate
      .locator(".feedback-people-list li")
      .filter({ hasText: guestBName });
    await guestBConcern.getByRole("button", { name: "外す" }).click();
    await expect(candidate.getByRole("button", { name: "気になるを付けた人を見る" })).toHaveText("1人");

    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(event.shareUrl);
    const { count: beforeFreshActions } = await client
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    candidate = freshPage.locator(".candidate-item").filter({ hasText: candidateTitle });
    await candidate.getByRole("button", { name: "興味ある？ ❤️" }).click();
    await expect(candidate.getByRole("button", { name: "興味ある？ ❤️" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await candidate.getByRole("button", { name: "🌀 気になる" }).click();
    await expect(candidate.getByRole("button", { name: "🌀 気になる" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const commentForm = candidate.locator("form.comment-form");
    const commentTextbox = commentForm.getByRole("textbox", { name: "コメント" });
    const originalComment = `[E2E] 最初のコメント ${unique}`;
    await expect(commentTextbox).toBeEnabled();
    await commentTextbox.fill(originalComment);
    await commentForm.getByRole("button", { name: "投稿" }).click();
    await expect(candidate.getByText(originalComment, { exact: true })).toBeVisible();
    await expect(candidate.getByText("500文字まで", { exact: true })).toBeVisible();
    await expect(candidate.getByText(/Unicodeコードポイント/)).toHaveCount(0);

    const { count: afterFreshActions } = await client
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    expect(afterFreshActions).toBe((beforeFreshActions ?? 0) + 1);

    let commentItem = candidate.locator(".comment-item").filter({ hasText: originalComment });
    await expect(commentItem.getByText("ー", { exact: true })).toBeVisible();
    await commentItem.getByRole("button", { name: "直す" }).click();
    let editingComment = candidate.locator(".comment-item").filter({
      has: freshPage.getByRole("textbox", { name: "コメントを編集" })
    });
    await expect(editingComment).toHaveCount(1);
    await editingComment
      .getByRole("textbox", { name: "コメントを編集" })
      .fill(`[E2E] キャンセル ${unique}`);
    await editingComment.getByRole("button", { name: "キャンセル" }).click();
    await expect(editingComment).toHaveCount(0);
    commentItem = candidate.locator(".comment-item").filter({ hasText: originalComment });
    await expect(commentItem.getByText(originalComment, { exact: true })).toBeVisible();

    const editedComment = `[E2E] 編集済みコメント ${unique}`;
    await commentItem.getByRole("button", { name: "直す" }).click();
    editingComment = candidate.locator(".comment-item").filter({
      has: freshPage.getByRole("textbox", { name: "コメントを編集" })
    });
    await expect(editingComment).toHaveCount(1);
    await editingComment
      .getByRole("textbox", { name: "コメントを編集" })
      .fill(editedComment);
    await editingComment.getByRole("button", { name: "保存" }).click();
    await expect(editingComment).toHaveCount(0);
    await expect(candidate.getByText(editedComment, { exact: true })).toBeVisible();
    commentItem = candidate.locator(".comment-item").filter({ hasText: editedComment });
    await expect(commentItem.getByText("ー", { exact: true })).toBeVisible();
    await expect(candidate.getByRole("dialog")).toHaveCount(0);

    const fiveHundredCodePoints = `[E2E]${"😀".repeat(495)}`;
    const comments = candidate.locator(".comment-item");
    const countBefore = await comments.count();
    await commentTextbox.fill(fiveHundredCodePoints);
    await commentForm.getByRole("button", { name: "投稿" }).click();
    await expect(commentTextbox).toHaveValue("");
    await expect(comments).toHaveCount(countBefore + 1);
    const { data: longComment } = await client
      .from("comments")
      .select("text")
      .eq("text", fiveHundredCodePoints)
      .single<{ text: string }>();
    expect(Array.from(longComment!.text)).toHaveLength(500);

    const fiveHundredOneCodePoints = `[E2E]${"😀".repeat(496)}`;
    await commentTextbox.fill(fiveHundredOneCodePoints);
    await commentForm.getByRole("button", { name: "投稿" }).click();
    await expect(freshPage.locator(".form-message.error")).toContainText(
      "コメントは1〜500文字で入力してください。"
    );
    await expect(commentTextbox).toHaveValue(fiveHundredOneCodePoints);

    const heartButton = candidate.getByRole("button", { name: "興味ある？ ❤️" });
    const heartStateBeforeFailure = await heartButton.getAttribute("aria-pressed");
    let abortedSlice5Action = false;
    await freshPage.route("**/*", async (route) => {
      const request = route.request();
      if (
        !abortedSlice5Action &&
        request.method() === "POST" &&
        request.headers()["next-action"]
      ) {
        abortedSlice5Action = true;
        await route.abort();
        return;
      }
      await route.continue();
    });
    await heartButton.click();
    await expect(freshPage.locator(".form-message.error")).toContainText(
      "操作を完了できませんでした。もう一度お試しください。"
    );
    await expect(heartButton).toHaveAttribute("aria-pressed", heartStateBeforeFailure!);
    await freshPage.unroute("**/*");

    commentItem = candidate.locator(".comment-item").filter({ hasText: editedComment });
    await commentItem.getByRole("button", { name: "消す" }).click();
    await expect(commentItem.getByRole("dialog")).toContainText("このコメントを削除しますか？");
    await commentItem.getByRole("dialog").getByRole("button", { name: "消す" }).click();
    await expect(candidate.getByText(editedComment, { exact: true })).toHaveCount(0);

    await expect(freshPage.getByRole("button", { name: /^[○−×]$/ })).toHaveCount(0);
    await freshContext.close();
    await guestBContext.close();
    await guestAContext.close();
  });

  test("enforces Slice 5 RLS, immutable columns, same-event references, and cascades", async ({
    browser,
    page
  }) => {
    const unique = Date.now().toString();
    const first = await createEvent(
      page,
      `[E2E] DB負系1 ${unique}`,
      `[E2E] DBオーナー1 ${unique}`
    );
    await addCandidate(page, `[E2E] DB候補1 ${unique}`);
    const firstEventId = await eventIdForShareToken(first.shareToken);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    const second = await createEvent(
      otherPage,
      `[E2E] DB負系2 ${unique}`,
      `[E2E] DBオーナー2 ${unique}`
    );
    await addCandidate(otherPage, `[E2E] DB候補2 ${unique}`);
    const secondEventId = await eventIdForShareToken(second.shareToken);

    const sameEventGuestContext = await browser.newContext();
    const sameEventGuestPage = await sameEventGuestContext.newPage();
    await sameEventGuestPage.goto(first.shareUrl);
    await addCandidate(
      sameEventGuestPage,
      `[E2E] DB候補・別参加者 ${unique}`,
      `[E2E] DB別参加者 ${unique}`
    );
    const sameEventGuestToken = await currentGuestToken(sameEventGuestContext);

    const firstClient = clientForTokens({
      shareToken: first.shareToken,
      guestToken: first.guestToken
    });
    const secondClient = clientForTokens({
      shareToken: second.shareToken,
      guestToken: second.guestToken
    });
    const sameEventGuestClient = clientForTokens({
      shareToken: first.shareToken,
      guestToken: sameEventGuestToken
    });
    const ownerOnlyClient = clientForTokens({ ownerToken: first.ownerToken });
    const noTokenClient = clientForTokens({});
    const wrongTokenClient = clientForTokens({ shareToken: "invalid-slice-5-token" });

    const { data: firstCandidate } = await firstClient
      .from("candidates")
      .select("id")
      .eq("event_id", firstEventId)
      .eq("title", `[E2E] DB候補1 ${unique}`)
      .single<{ id: string }>();
    const { data: secondCandidate } = await secondClient
      .from("candidates")
      .select("id")
      .eq("event_id", secondEventId)
      .single<{ id: string }>();
    const { data: firstParticipant } = await firstClient
      .from("participants")
      .select("id")
      .eq("event_id", firstEventId)
      .eq("display_name", `[E2E] DBオーナー1 ${unique}`)
      .single<{ id: string }>();
    const { data: secondParticipant } = await secondClient
      .from("participants")
      .select("id")
      .eq("event_id", secondEventId)
      .single<{ id: string }>();
    const { data: sameEventParticipant } = await sameEventGuestClient
      .from("participants")
      .select("id")
      .eq("event_id", firstEventId)
      .eq("display_name", `[E2E] DB別参加者 ${unique}`)
      .single<{ id: string }>();
    const { data: firstCriterion } = await firstClient
      .from("criteria")
      .select("id")
      .eq("event_id", firstEventId)
      .single<{ id: string }>();
    const { data: secondCriterion } = await secondClient
      .from("criteria")
      .select("id")
      .eq("event_id", secondEventId)
      .single<{ id: string }>();

    const { data: ownerSelect } = await ownerOnlyClient
      .from("criteria")
      .select("id")
      .eq("event_id", firstEventId);
    expect(ownerSelect).toHaveLength(1);
    const { data: noTokenSelect } = await noTokenClient.from("criteria").select("id");
    expect(noTokenSelect).toEqual([]);
    const { data: wrongTokenSelect } = await wrongTokenClient.from("criteria").select("id");
    expect(wrongTokenSelect).toEqual([]);

    const { error: ownerMutationError } = await ownerOnlyClient.from("criteria").insert({
      event_id: firstEventId,
      label: `[E2E] owner only ${unique}`,
      source: "custom"
    });
    expect(ownerMutationError).not.toBeNull();
    const { error: wrongTokenMutationError } = await wrongTokenClient.from("criteria").insert({
      event_id: firstEventId,
      label: `[E2E] wrong token ${unique}`,
      source: "custom"
    });
    expect(wrongTokenMutationError).not.toBeNull();

    const { error: explicitCreatedByError } = await firstClient.from("criteria").insert({
      event_id: firstEventId,
      label: `[E2E] explicit creator ${unique}`,
      source: "custom",
      created_by: firstParticipant!.id
    });
    expect(explicitCreatedByError).not.toBeNull();
    const { error: invalidSourceError } = await firstClient.from("criteria").insert({
      event_id: firstEventId,
      label: `[E2E] invalid source ${unique}`,
      source: "invalid"
    });
    expect(invalidSourceError).not.toBeNull();
    const { error: blankLabelError } = await firstClient.from("criteria").insert({
      event_id: firstEventId,
      label: "   ",
      source: "custom"
    });
    expect(blankLabelError).not.toBeNull();
    const { error: longLabelError } = await firstClient.from("criteria").insert({
      event_id: firstEventId,
      label: "あ".repeat(61),
      source: "custom"
    });
    expect(longLabelError).not.toBeNull();
    const { data: sixtyCharacterCriterion, error: sixtyCharacterCriterionError } =
      await firstClient
        .from("criteria")
        .insert({
          event_id: firstEventId,
          label: "界".repeat(60),
          source: "custom"
        })
        .select("id")
        .single<{ id: string }>();
    expect(sixtyCharacterCriterionError).toBeNull();
    await firstClient
      .from("criteria")
      .delete()
      .eq("id", sixtyCharacterCriterion!.id);

    const { error: immutableCriterionError } = await firstClient
      .from("criteria")
      .update({ source: "preset" })
      .eq("id", firstCriterion!.id);
    expect(immutableCriterionError).not.toBeNull();
    const { error: validCriterionUpdateError } = await firstClient
      .from("criteria")
      .update({ label: `[E2E] DB更新 ${unique}` })
      .eq("id", firstCriterion!.id);
    expect(validCriterionUpdateError).toBeNull();

    const reactionPayload = {
      candidate_id: firstCandidate!.id,
      participant_id: firstParticipant!.id,
      criterion_id: firstCriterion!.id
    };
    const { data: ownReaction, error: ownReactionError } = await firstClient
      .from("reactions")
      .insert(reactionPayload)
      .select("id")
      .single<{ id: string }>();
    expect(ownReactionError).toBeNull();
    const { error: duplicateReactionError } = await firstClient
      .from("reactions")
      .insert(reactionPayload);
    expect(duplicateReactionError).not.toBeNull();
    const { error: otherNameReactionError } = await firstClient.from("reactions").insert({
      candidate_id: firstCandidate!.id,
      participant_id: sameEventParticipant!.id,
      criterion_id: firstCriterion!.id
    });
    expect(otherNameReactionError).not.toBeNull();
    const { error: crossCriterionError } = await firstClient.from("reactions").insert({
      candidate_id: firstCandidate!.id,
      participant_id: firstParticipant!.id,
      criterion_id: secondCriterion!.id
    });
    expect(crossCriterionError).not.toBeNull();
    const { error: reactionUpdateError } = await firstClient
      .from("reactions")
      .update({ participant_id: sameEventParticipant!.id })
      .eq("id", ownReaction!.id);
    expect(reactionUpdateError).not.toBeNull();

    const { data: otherReaction } = await sameEventGuestClient
      .from("reactions")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: sameEventParticipant!.id,
        criterion_id: firstCriterion!.id
      })
      .select("id")
      .single<{ id: string }>();
    const { error: removeOtherReactionError } = await firstClient
      .from("reactions")
      .delete()
      .eq("id", otherReaction!.id);
    expect(removeOtherReactionError).toBeNull();

    const { data: concern, error: concernError } = await firstClient
      .from("concerns")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: firstParticipant!.id
      })
      .select("id")
      .single<{ id: string }>();
    expect(concernError).toBeNull();
    const { error: duplicateConcernError } = await firstClient.from("concerns").insert({
      candidate_id: firstCandidate!.id,
      participant_id: firstParticipant!.id
    });
    expect(duplicateConcernError).not.toBeNull();
    const { error: crossConcernError } = await firstClient.from("concerns").insert({
      candidate_id: firstCandidate!.id,
      participant_id: secondParticipant!.id
    });
    expect(crossConcernError).not.toBeNull();
    const { error: concernUpdateError } = await firstClient
      .from("concerns")
      .update({ participant_id: sameEventParticipant!.id })
      .eq("id", concern!.id);
    expect(concernUpdateError).not.toBeNull();

    const { error: nullCommentParticipantError } = await firstClient.from("comments").insert({
      candidate_id: firstCandidate!.id,
      participant_id: null,
      text: `[E2E] null participant ${unique}`
    });
    expect(nullCommentParticipantError).not.toBeNull();
    const { error: crossCommentError } = await firstClient.from("comments").insert({
      candidate_id: secondCandidate!.id,
      participant_id: firstParticipant!.id,
      text: `[E2E] cross event ${unique}`
    });
    expect(crossCommentError).not.toBeNull();

    const fiveHundred = "😀".repeat(500);
    const { data: acceptedComment, error: acceptedCommentError } = await firstClient
      .from("comments")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: firstParticipant!.id,
        text: fiveHundred
      })
      .select("id,text")
      .single<{ id: string; text: string }>();
    expect(acceptedCommentError).toBeNull();
    expect(Array.from(acceptedComment!.text)).toHaveLength(500);
    const { error: tooLongCommentError } = await firstClient.from("comments").insert({
      candidate_id: firstCandidate!.id,
      participant_id: firstParticipant!.id,
      text: "😀".repeat(501)
    });
    expect(tooLongCommentError).not.toBeNull();
    const { error: blankCommentError } = await firstClient.from("comments").insert({
      candidate_id: firstCandidate!.id,
      participant_id: firstParticipant!.id,
      text: "   "
    });
    expect(blankCommentError).not.toBeNull();
    const { data: trimmedComment } = await firstClient
      .from("comments")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: firstParticipant!.id,
        text: "  あ  "
      })
      .select("id,text")
      .single<{ id: string; text: string }>();
    expect(trimmedComment?.text).toBe("あ");
    const { error: immutableCommentError } = await firstClient
      .from("comments")
      .update({ participant_id: sameEventParticipant!.id })
      .eq("id", acceptedComment!.id);
    expect(immutableCommentError).not.toBeNull();

    const [
      ownerCriteria,
      ownerReactions,
      ownerConcerns,
      ownerComments,
      noTokenReactions,
      noTokenConcerns,
      noTokenComments,
      wrongTokenReactions,
      wrongTokenConcerns,
      wrongTokenComments
    ] = await Promise.all([
      ownerOnlyClient.from("criteria").select("id").eq("event_id", firstEventId),
      ownerOnlyClient.from("reactions").select("id").eq("candidate_id", firstCandidate!.id),
      ownerOnlyClient.from("concerns").select("id").eq("candidate_id", firstCandidate!.id),
      ownerOnlyClient.from("comments").select("id").eq("candidate_id", firstCandidate!.id),
      noTokenClient.from("reactions").select("id"),
      noTokenClient.from("concerns").select("id"),
      noTokenClient.from("comments").select("id"),
      wrongTokenClient.from("reactions").select("id"),
      wrongTokenClient.from("concerns").select("id"),
      wrongTokenClient.from("comments").select("id")
    ]);
    expect(ownerCriteria.data?.length).toBeGreaterThan(0);
    expect(ownerReactions.data?.length).toBeGreaterThan(0);
    expect(ownerConcerns.data?.length).toBeGreaterThan(0);
    expect(ownerComments.data?.length).toBeGreaterThan(0);
    expect(noTokenReactions.data).toEqual([]);
    expect(noTokenConcerns.data).toEqual([]);
    expect(noTokenComments.data).toEqual([]);
    expect(wrongTokenReactions.data).toEqual([]);
    expect(wrongTokenConcerns.data).toEqual([]);
    expect(wrongTokenComments.data).toEqual([]);

    const { error: ownerReactionMutationError } = await ownerOnlyClient
      .from("reactions")
      .insert(reactionPayload);
    expect(ownerReactionMutationError).not.toBeNull();
    const { error: ownerConcernMutationError } = await ownerOnlyClient
      .from("concerns")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: firstParticipant!.id
      });
    expect(ownerConcernMutationError).not.toBeNull();
    const { error: ownerCommentMutationError } = await ownerOnlyClient
      .from("comments")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: firstParticipant!.id,
        text: `[E2E] owner only comment ${unique}`
      });
    expect(ownerCommentMutationError).not.toBeNull();
    const { error: otherEventTokenCriterionError } = await secondClient
      .from("criteria")
      .insert({
        event_id: firstEventId,
        label: `[E2E] other event token ${unique}`,
        source: "custom"
      });
    expect(otherEventTokenCriterionError).not.toBeNull();

    const cascadeLabel = `[E2E] cascade criterion ${unique}`;
    await firstClient.from("criteria").insert({
      event_id: firstEventId,
      label: cascadeLabel,
      source: "custom"
    });
    const { data: cascadeCriterion } = await firstClient
      .from("criteria")
      .select("id")
      .eq("event_id", firstEventId)
      .eq("label", cascadeLabel)
      .single<{ id: string }>();
    const { data: cascadeReaction } = await firstClient
      .from("reactions")
      .insert({
        candidate_id: firstCandidate!.id,
        participant_id: firstParticipant!.id,
        criterion_id: cascadeCriterion!.id
      })
      .select("id")
      .single<{ id: string }>();
    await firstClient.from("criteria").delete().eq("id", cascadeCriterion!.id);
    const { data: reactionAfterCriterionDelete } = await firstClient
      .from("reactions")
      .select("id")
      .eq("id", cascadeReaction!.id);
    expect(reactionAfterCriterionDelete).toEqual([]);

    await firstClient.from("candidates").delete().eq("id", firstCandidate!.id);
    const [reactionAfterCandidate, concernAfterCandidate, commentAfterCandidate] =
      await Promise.all([
        firstClient.from("reactions").select("id").eq("candidate_id", firstCandidate!.id),
        firstClient.from("concerns").select("id").eq("candidate_id", firstCandidate!.id),
        firstClient.from("comments").select("id").eq("candidate_id", firstCandidate!.id)
      ]);
    expect(reactionAfterCandidate.data).toEqual([]);
    expect(concernAfterCandidate.data).toEqual([]);
    expect(commentAfterCandidate.data).toEqual([]);

    await sameEventGuestContext.close();
    await otherContext.close();
  });

  test("recovers owner identity for all shared Slice 5 operations and stays responsive", async ({
    browser,
    page
  }) => {
    const unique = Date.now().toString();
    const ownerName = `[E2E] 回復オーナー ${unique}`;
    const event = await createEvent(page, `[E2E] owner回復 ${unique}`, ownerName);
    const candidateTitle = `[E2E] owner操作候補 ${unique}`;
    await addCandidate(page, candidateTitle);

    const recoveredContext = await browser.newContext();
    const recoveredPage = await recoveredContext.newPage();
    await recoveredPage.goto(event.ownerUrl);
    await expect(recoveredPage.getByRole("button", { name: "価格どう？" })).toBeEnabled();
    await recoveredPage.getByRole("button", { name: "価格どう？" }).click();
    await expect(
      recoveredPage.locator(".criterion-row strong").filter({ hasText: "価格どう？" })
    ).toBeVisible();

    const candidate = recoveredPage.locator(".candidate-item").filter({ hasText: candidateTitle });
    await candidate.getByRole("button", { name: "価格どう？ ❤️" }).click();
    await expect(candidate.getByRole("button", { name: "価格どう？ ❤️" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await candidate.getByRole("button", { name: "🌀 気になる" }).click();
    await expect(candidate.getByRole("button", { name: "🌀 気になる" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const ownerComment = `[E2E] owner URLコメント ${unique}`;
    const ownerCommentTextbox = candidate.getByRole("textbox", { name: "コメント" });
    await expect(ownerCommentTextbox).toBeEnabled();
    await ownerCommentTextbox.fill(ownerComment);
    await candidate.getByRole("button", { name: "投稿" }).click();
    await expect(candidate.getByText(ownerComment, { exact: true })).toBeVisible();

    const recoveredGuestToken = await currentGuestToken(recoveredContext);
    const eventId = await eventIdForShareToken(event.shareToken);
    const client = clientForTokens({
      shareToken: event.shareToken,
      guestToken: recoveredGuestToken
    });
    const { data: ownerParticipant } = await client
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("display_name", ownerName)
      .single<{ id: string }>();
    const { data: ownerReaction } = await client
      .from("reactions")
      .select("participant_id")
      .eq("participant_id", ownerParticipant!.id);
    expect(ownerReaction).toHaveLength(1);

    for (const viewport of [
      { width: 375, height: 812 },
      { width: 1366, height: 768 }
    ]) {
      await recoveredPage.setViewportSize(viewport);
      await expect
        .poll(() =>
          recoveredPage.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1
          )
        )
        .toBe(true);
    }

    await expect(recoveredPage.getByRole("button", { name: /^[○−×]$/ })).toHaveCount(0);
    await expect(recoveredPage.getByText(/Realtime|履歴|FAQ/)).toHaveCount(0);
    await recoveredContext.close();
  });
});
