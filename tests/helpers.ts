import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export function clientForTokens(tokens: { shareToken?: string }) {
  const headers: Record<string, string> = {};
  if (tokens.shareToken) headers["x-share-token"] = tokens.shareToken;
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers }
  });
}

export type CreatedEvent = {
  eventId: string;
  shareToken: string;
  shareUrl: string;
};

export async function createEvent(page: Page, title: string): Promise<CreatedEvent> {
  await page.goto("/");
  await page.getByLabel("きめること").fill(title);
  await page
    .getByLabel("つたえたいこと")
    .fill("[E2E] みんなの意見を見える化するメモ");
  await page.getByRole("button", { name: "きめよう！" }).click();
  const confirmation = page.getByRole("dialog");
  await expect(confirmation).toContainText(
    "この内容で作成してもよろしいですか？"
  );
  await expect(confirmation).toContainText(
    "作成後に「きめること」は変更できません。"
  );
  await confirmation.getByRole("button", { name: "作成", exact: true }).click();
  await expect(page).toHaveURL(/\/e\/[^/?]+(?:\?created=1)?$/);
  await expect(page.getByRole("heading", { name: "お名前を入れる" }).first()).toBeVisible();

  const shareUrl = page.url().split("?")[0];
  const shareToken = new URL(shareUrl).pathname.split("/").at(-1)!;
  const shareClient = clientForTokens({ shareToken });
  const { data, error } = await shareClient
    .from("events")
    .select("id")
    .eq("share_token", shareToken)
    .single<{ id: string }>();
  expect(error).toBeNull();

  await expect(page.getByLabel("直接入力")).toBeEnabled();
  return { eventId: data!.id, shareToken, shareUrl };
}

export async function createOrSelectParticipant(page: Page, name: string) {
  const existing = page.getByRole("button", { name, exact: true });
  if (await existing.count()) {
    await existing.click();
    return;
  }
  const input = page.getByLabel("直接入力");
  await input.fill(name);
  await input.press("Enter");
  await expect(
    page
      .getByRole("button", { name, exact: true })
      .or(page.getByRole("heading", { name: `${name}として判断中` }))
  ).toBeVisible();
}

export async function addCandidate(page: Page, title: string, url = "") {
  const form = page.locator("form.candidate-add-form");
  const titleInput = form.getByLabel("候補名");
  await titleInput.fill(title);
  if (url) await form.getByLabel("リンク").fill(url);
  await form.getByRole("button", { name: "追加" }).click();
  await expect(titleInput).toHaveValue("");
}

export async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    )
    .toBe(true);
}
