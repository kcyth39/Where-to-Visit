import { expect, test, type Page } from "@playwright/test";
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

function clientForShareToken(shareToken: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-share-token": shareToken } }
  });
}

async function createEvent(page: Page, title: string, name: string) {
  await page.goto("/");
  await page.getByLabel("お題").fill(title);
  await page.getByLabel("お名前").fill(name);
  await page.getByRole("button", { name: "きめよう！" }).click();
  await expect(page).toHaveURL(/\/o\/[^/?]+/);

  const shareUrl = await page.locator("code").filter({ hasText: "/e/" }).first().textContent();
  expect(shareUrl).toMatch(/\/e\/[A-Za-z0-9_-]+$/);
  return shareUrl!;
}

test.describe("Slice 2 candidate management", () => {
  test.skip(
    !hasSupabaseEnv,
    "Supabase env or migration is not prepared; Slice 2 E2E is pending."
  );

  test("manages candidates, proposers, confirmations, and RLS safely", async ({
    browser,
    page
  }) => {
    const unique = Date.now().toString();
    const eventTitle = `[E2E] 候補管理 ${unique}`;
    const shareUrl = await createEvent(page, eventTitle, "");

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(shareUrl);

    const candidateForm = guestPage.locator("form.candidate-form");
    await expect(candidateForm.getByLabel("タイトル")).toHaveAttribute(
      "placeholder",
      "例）候補の名前 など"
    );
    const titleOnly = `[E2E] タイトルのみ ${unique}`;
    await candidateForm.getByLabel("タイトル").fill(titleOnly);
    await candidateForm.getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByText(titleOnly)).toBeVisible();
    await expect(guestPage.getByText("提案: ー")).toBeVisible();

    const urlOnly = `https://example.com/e2e-${unique}`;
    await candidateForm.getByLabel("リンク").fill(urlOnly);
    await candidateForm.getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByRole("link", { name: urlOnly })).toBeVisible();

    await candidateForm.getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByText("タイトルかリンクのどちらかを入力してください。")).toBeVisible();

    const bothTitle = `[E2E] 両方 ${unique}`;
    const guestName = `[E2E] ゲスト ${unique}`;
    await candidateForm.getByLabel("タイトル").fill(bothTitle);
    await candidateForm.getByLabel("リンク").fill(`https://example.com/both-${unique}`);
    await candidateForm.getByLabel("お名前（任意）").fill(guestName);
    await candidateForm.getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByText(`提案: ${guestName}`).first()).toBeVisible();
    await expect(guestPage.getByText(`提案: ${guestName}`)).toHaveCount(3);

    const updatedGuestName = `[E2E] ゲスト更新 ${unique}`;
    await candidateForm.getByLabel("タイトル").fill(`[E2E] 再追加 ${unique}`);
    await candidateForm.getByLabel("お名前（任意）").fill(updatedGuestName);
    await candidateForm.getByRole("button", { name: "追加" }).click();
    await expect(guestPage.getByText(`提案: ${updatedGuestName}`)).toHaveCount(4);

    const candidateItem = guestPage.locator(".candidate-item").filter({ hasText: bothTitle });
    await candidateItem.getByRole("button", { name: "編集" }).click();
    await expect(candidateItem.getByLabel("提案者").locator("option")).toHaveCount(3);
    await expect(candidateItem.getByLabel("提案者").locator("option").first()).toHaveText("ー");

    const editedTitle = `[E2E] 編集済み ${unique}`;
    await candidateItem.getByLabel("タイトル").fill(editedTitle);
    await candidateItem.getByRole("button", { name: "タイトルを変更" }).click();
    await expect(guestPage.getByRole("dialog")).toContainText("変更します、よろしいですか？");
    await guestPage.getByRole("dialog").getByRole("button", { name: "変更" }).click();
    await expect(guestPage.getByText(editedTitle)).toBeVisible();

    const editedItem = guestPage.locator(".candidate-item").filter({ hasText: editedTitle });
    await editedItem.getByRole("button", { name: "編集" }).click();
    await editedItem.getByLabel("リンク").fill(`https://example.com/edited-${unique}`);
    await editedItem.getByRole("button", { name: "リンクを変更" }).click();
    await guestPage.getByRole("dialog").getByRole("button", { name: "変更" }).click();
    await expect(guestPage.getByRole("link", { name: `https://example.com/edited-${unique}` })).toBeVisible();

    await editedItem.getByRole("button", { name: "編集" }).click();
    await editedItem.getByLabel("提案者").selectOption("");
    await editedItem.getByRole("button", { name: "提案者を変更" }).click();
    await guestPage.getByRole("dialog").getByRole("button", { name: "変更" }).click();
    await expect(editedItem.getByText("提案: ー")).toBeVisible();

    const deleteTitle = `[E2E] 削除対象 ${unique}`;
    await candidateForm.getByLabel("タイトル").fill(deleteTitle);
    await candidateForm.getByRole("button", { name: "追加" }).click();
    const deleteItem = guestPage.locator(".candidate-item").filter({ hasText: deleteTitle });
    await deleteItem.getByRole("button", { name: "削除" }).click();
    await expect(guestPage.getByRole("dialog")).toContainText("この候補を消しますか？");
    await guestPage.getByRole("dialog").getByRole("button", { name: "消す" }).click();
    await expect(guestPage.locator(".danger-dialog")).toContainText("本当によろしいですか？");
    await guestPage.locator(".danger-dialog").getByRole("button", { name: "消す" }).click();
    await expect(guestPage.getByText(deleteTitle)).toHaveCount(0);

    await expect(guestPage.getByRole("button", { name: /^[○−×]$/ })).toHaveCount(0);

    const shareToken = new URL(shareUrl).pathname.split("/").at(-1)!;
    const client = clientForShareToken(shareToken);
    const { data: event } = await client
      .from("events")
      .select("id")
      .eq("share_token", shareToken)
      .single<{ id: string }>();
    const { data: candidates } = await client
      .from("candidates")
      .select("id,created_by")
      .eq("event_id", event!.id)
      .returns<Array<{ id: string; created_by: string | null }>>();
    const { data: participants } = await client
      .from("participants")
      .select("id,display_name")
      .eq("event_id", event!.id)
      .returns<Array<{ id: string; display_name: string | null }>>();
    expect(candidates?.length).toBeGreaterThan(0);
    expect(participants?.length).toBeGreaterThan(1);
    expect(candidates?.some((candidate) => candidate.created_by !== null)).toBe(true);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    const otherShareUrl = await createEvent(
      otherPage,
      `[E2E] 別イベント ${unique}`,
      `[E2E] 別オーナー ${unique}`
    );
    const otherShareToken = new URL(otherShareUrl).pathname.split("/").at(-1)!;
    const otherClient = clientForShareToken(otherShareToken);
    const { data: otherEvent } = await otherClient
      .from("events")
      .select("id")
      .eq("share_token", otherShareToken)
      .single<{ id: string }>();
    const { data: otherParticipant } = await otherClient
      .from("participants")
      .select("id")
      .eq("event_id", otherEvent!.id)
      .single<{ id: string }>();
    const protectedCandidate = candidates?.find((candidate) => candidate.created_by !== null);
    const { error: reassignmentError } = await client
      .from("candidates")
      .update({ created_by: otherParticipant!.id })
      .eq("id", protectedCandidate!.id);
    expect(reassignmentError).not.toBeNull();

    await guestPage.setViewportSize({ height: 812, width: 375 });
    await expect
      .poll(() =>
        guestPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      )
      .toBe(true);
    await guestPage.setViewportSize({ height: 768, width: 1366 });
    await expect
      .poll(() =>
        guestPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
      )
      .toBe(true);

    await otherContext.close();
    await guestContext.close();
  });
});
