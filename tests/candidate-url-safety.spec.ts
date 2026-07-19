import { expect, test } from "@playwright/test";

import {
  CANDIDATE_URL_ERROR_MESSAGES,
  normalizeCandidateUrl
} from "../src/lib/candidate-url";
import {
  createCandidate as createCandidateMutation,
  updateCandidate as updateCandidateMutation
} from "../src/lib/events";
import {
  clientForTokens,
  createEvent,
  expectNoHorizontalOverflow,
  hasSupabaseEnv
} from "./helpers";

const encoder = new TextEncoder();

function exactByteUrl(byteLength: number): string {
  const prefix = "https://example.com/";
  return `${prefix}${"a".repeat(byteLength - encoder.encode(prefix).byteLength)}`;
}

test.describe("Candidate URL pure contract", () => {
  test("normalizes approved HTTP and HTTPS inputs", () => {
    expect(normalizeCandidateUrl("  ")).toEqual({ value: null, error: null });
    expect(normalizeCandidateUrl("  HTTPS://Example.COM/path  ")).toEqual({
      value: "https://example.com/path",
      error: null
    });
    expect(normalizeCandidateUrl("HTTP://Example.COM:80")).toEqual({
      value: "http://example.com/",
      error: null
    });
    expect(normalizeCandidateUrl("https://example.com:443/path?q=1#part")).toEqual({
      value: "https://example.com/path?q=1#part",
      error: null
    });
    expect(normalizeCandidateUrl("https://例え.テスト/道?q=値#片")).toEqual({
      value: new URL("https://例え.テスト/道?q=値#片").href,
      error: null
    });
  });

  test("rejects malformed, non-HTTP, credential, and control-character inputs", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/plain,test",
      "ftp://example.com/file",
      "mailto:test@example.com",
      "/relative",
      "//example.com/path",
      "http:example.com",
      "https:///path",
      "https://example.com:bad/path",
      "\nhttps://example.com/leading-newline",
      "https://example.com/trailing-tab\t",
      `${String.fromCharCode(127)}https://example.com/leading-del`,
      `https://example.com/trailing-del${String.fromCharCode(127)}`,
      "\n",
      " \t ",
      "https://example.com/path\nnext",
      "https://example.com/path\tnext",
      `https://example.com/path${String.fromCharCode(1)}next`,
      `https://example.com/path${String.fromCharCode(127)}next`
    ]) {
      expect(normalizeCandidateUrl(value)).toEqual({
        value: null,
        error: "invalid_format"
      });
    }

    for (const value of [
      "https://user@example.com/",
      "https://user:password@example.com/",
      "https://:password@example.com/"
    ]) {
      expect(normalizeCandidateUrl(value)).toEqual({
        value: null,
        error: "credentials"
      });
    }
  });

  test("measures the normalized UTF-8 representation at the byte boundary", () => {
    const atLimit = exactByteUrl(4096);
    const overLimit = exactByteUrl(4097);
    expect(encoder.encode(new URL(atLimit).href)).toHaveLength(4096);
    expect(normalizeCandidateUrl(atLimit)).toEqual({ value: atLimit, error: null });
    expect(normalizeCandidateUrl(overLimit)).toEqual({
      value: null,
      error: "too_long"
    });

    const credentialOverLimit = `https://user@example.com/${"a".repeat(4096)}`;
    expect(normalizeCandidateUrl(credentialOverLimit).error).toBe("credentials");
  });
});

test("applies the same server contract to Candidate add and URL update", async ({ page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const created = await createEvent(page, `[E2E] Candidate URL server contract ${unique}`);
  const client = clientForTokens({ shareToken: created.shareToken });

  for (const [value, error] of [
    ["javascript:alert(1)", CANDIDATE_URL_ERROR_MESSAGES.invalid_format],
    ["\nhttps://example.com/add-boundary", CANDIDATE_URL_ERROR_MESSAGES.invalid_format],
    ["https://user:password@example.com/", CANDIDATE_URL_ERROR_MESSAGES.credentials],
    [exactByteUrl(4097), CANDIDATE_URL_ERROR_MESSAGES.too_long]
  ] as const) {
    const before = await client
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("event_id", created.eventId);
    const result = await createCandidateMutation(
      created.eventId,
      created.shareToken,
      "server bypass",
      value,
      null
    );
    expect(result).toEqual({ data: null, error });
    const after = await client
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("event_id", created.eventId);
    expect(after.count).toBe(before.count);
  }

  const addResult = await createCandidateMutation(
    created.eventId,
    created.shareToken,
    "normalized server Candidate",
    "HTTP://Example.COM:80/path",
    null
  );
  expect(addResult.error).toBeNull();
  const { data: candidate } = await client
    .from("candidates")
    .select("id,url")
    .eq("event_id", created.eventId)
    .eq("title", "normalized server Candidate")
    .single<{ id: string; url: string }>();
  expect(candidate?.url).toBe("http://example.com/path");

  for (const [value, error] of [
    ["mailto:test@example.com", CANDIDATE_URL_ERROR_MESSAGES.invalid_format],
    ["https://example.com/update-boundary\t", CANDIDATE_URL_ERROR_MESSAGES.invalid_format],
    ["https://user@example.com/", CANDIDATE_URL_ERROR_MESSAGES.credentials],
    [exactByteUrl(4097), CANDIDATE_URL_ERROR_MESSAGES.too_long]
  ] as const) {
    const failedUpdate = await updateCandidateMutation(
      created.eventId,
      created.shareToken,
      candidate!.id,
      "url",
      value
    );
    expect(failedUpdate).toEqual({ data: null, error });
    const afterFailure = await client
      .from("candidates")
      .select("url")
      .eq("id", candidate!.id)
      .single<{ url: string }>();
    expect(afterFailure.data?.url).toBe("http://example.com/path");
  }

  const updateResult = await updateCandidateMutation(
    created.eventId,
    created.shareToken,
    candidate!.id,
    "url",
    "HTTPS://Example.COM:443/updated?q=1#part"
  );
  expect(updateResult.error).toBeNull();
  const afterSuccess = await client
    .from("candidates")
    .select("url")
    .eq("id", candidate!.id)
    .single<{ url: string }>();
  expect(afterSuccess.data?.url).toBe("https://example.com/updated?q=1#part");

  const urlOnlyResult = await createCandidateMutation(
    created.eventId,
    created.shareToken,
    "",
    "https://example.com/url-only",
    null
  );
  expect(urlOnlyResult.error).toBeNull();
  const { data: urlOnlyCandidate } = await client
    .from("candidates")
    .select("id,url")
    .eq("event_id", created.eventId)
    .is("title", null)
    .single<{ id: string; url: string }>();
  const emptyUpdate = await updateCandidateMutation(
    created.eventId,
    created.shareToken,
    urlOnlyCandidate!.id,
    "url",
    ""
  );
  expect(emptyUpdate.data).toBeNull();
  const afterEmptyUpdate = await client
    .from("candidates")
    .select("url")
    .eq("id", urlOnlyCandidate!.id)
    .single<{ url: string }>();
  expect(afterEmptyUpdate.data?.url).toBe("https://example.com/url-only");

  const invalidTokenResult = await createCandidateMutation(
    created.eventId,
    "invalid-share-token",
    "must not be created",
    "https://example.com/blocked",
    null
  );
  expect(invalidTokenResult.data).toBeNull();
});

test("keeps raw drafts on URL errors and shows normalized safe links after success", async ({ page }) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const participantName = `[E2E] URL確認者 ${unique}`;
  const candidateName = `[E2E] URL候補 ${unique}`;
  const created = await createEvent(page, `[E2E] Candidate URL UI contract ${unique}`);
  const form = page.locator("form.candidate-add-form");
  const titleInput = form.getByLabel("候補名");
  const urlInput = form.getByLabel("リンク");

  await page.getByLabel("直接入力").fill(participantName);
  await titleInput.fill(candidateName);
  await urlInput.fill("https://user:password@example.com/raw");
  await form.getByRole("button", { name: "追加" }).click();
  await expect(form.getByRole("alert")).toHaveText(
    CANDIDATE_URL_ERROR_MESSAGES.credentials
  );
  await expect(titleInput).toHaveValue(candidateName);
  await expect(urlInput).toHaveValue("https://user:password@example.com/raw");
  await expect(page.getByLabel("直接入力")).toHaveValue(participantName);

  await urlInput.fill("HTTP://Example.COM:80/path?q=1#part");
  await form.getByRole("button", { name: "追加" }).click();
  await expect(titleInput).toHaveValue("");
  await expect(urlInput).toHaveValue("");
  await expect(page.getByRole("button", { name: participantName, exact: true })).toBeVisible();

  await page.getByRole("button", { name: "さあ、きめよう！" }).click();
  await page.getByRole("link", { name: "わたしの意見を入力" }).click();
  const summaryLink = page
    .getByRole("table", { name: "候補のまとめ" })
    .getByRole("link", { name: "http://example.com/path?q=1#part", exact: true });
  await expect(summaryLink).toHaveAttribute("href", "http://example.com/path?q=1#part");
  await expect(summaryLink).toHaveAttribute("target", "_blank");
  await expect(summaryLink).toHaveAttribute("rel", "noopener noreferrer");

  await page.getByRole("link", { name: candidateName, exact: true }).click();
  await page.getByRole("button", { name: "候補内容の編集" }).click();
  const editor = page.locator(".candidate-info-editor");
  const editorUrl = editor.getByLabel("リンク");
  await editorUrl.fill("data:text/plain,raw-draft");
  await editor.getByRole("button", { name: "変更" }).nth(1).click();
  await expect(editor.getByRole("alert")).toHaveText(
    CANDIDATE_URL_ERROR_MESSAGES.invalid_format
  );
  await expect(editorUrl).toHaveValue("data:text/plain,raw-draft");
  await expect(page.getByRole("heading", { name: candidateName })).toBeVisible();

  await editorUrl.fill("HTTPS://Example.COM:443/final");
  await editor.getByRole("button", { name: "変更" }).nth(1).click();
  await page.getByRole("dialog").getByRole("button", { name: "変更" }).click();
  await expect(editorUrl).toHaveValue("https://example.com/final");
  const detailLink = page.getByRole("link", {
    name: "https://example.com/final",
    exact: true
  });
  await expect(detailLink).toHaveAttribute("target", "_blank");
  await expect(detailLink).toHaveAttribute("rel", "noopener noreferrer");

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 1366, height: 768 }
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
  }

  await page.goto(created.shareUrl);
  await expect(
    page.getByRole("heading", { name: `${participantName}として判断中` })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: candidateName, exact: true })
  ).toBeVisible();
});
