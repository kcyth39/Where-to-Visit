import { expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export function clientForTokens(tokens: {
  shareToken?: string;
  ownerToken?: string;
}) {
  const headers: Record<string, string> = {};
  if (tokens.shareToken) headers["x-share-token"] = tokens.shareToken;
  if (tokens.ownerToken) headers["x-owner-token"] = tokens.ownerToken;
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers }
  });
}

export type CreatedEvent = {
  eventId: string;
  ownerToken: string;
  ownerUrl: string;
  shareToken: string;
  shareUrl: string;
};

export async function createEvent(page: Page, title: string): Promise<CreatedEvent> {
  await page.goto("/");
  await page.getByLabel("きめること").fill(title);
  await page.getByLabel("つたえておきたいこと（任意）").fill("[E2E] みんなの意見を見える化するメモ");
  await page.getByRole("button", { name: "きめよう！" }).click();
  await expect(page).toHaveURL(/\/o\/[^/?]+$/);
  await expect(page.getByRole("heading", { name: "お名前を入れる" }).first()).toBeVisible();

  const ownerUrl = page.url().split("?")[0];
  const ownerToken = new URL(ownerUrl).pathname.split("/").at(-1)!;
  const ownerClient = clientForTokens({ ownerToken });
  const { data, error } = await ownerClient
    .from("events")
    .select("id,share_token")
    .single<{ id: string; share_token: string }>();
  expect(error).toBeNull();
  const shareToken = data!.share_token;
  const shareUrl = new URL(`/e/${shareToken}`, ownerUrl).toString();

  await expect(page.getByLabel("直接入力")).toBeEnabled();
  return { eventId: data!.id, ownerToken, ownerUrl, shareToken, shareUrl };
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
  const titleInput = form.getByLabel("候補");
  await titleInput.fill(title);
  if (url) await form.getByLabel("リンク").fill(url);
  await form.getByRole("button", { name: "追加" }).click();
  await expect(titleInput).toHaveValue("");
}

export async function ownerCookie(context: BrowserContext, shareToken: string) {
  await expect
    .poll(async () =>
      (await context.cookies()).find(
        (cookie) => cookie.name === "kimenosuke_owner_token"
      )
    )
    .toMatchObject({ httpOnly: true, path: `/e/${shareToken}` });
}

export async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    )
    .toBe(true);
}
