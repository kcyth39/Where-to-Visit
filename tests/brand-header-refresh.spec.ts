import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  addCandidate,
  createEvent,
  expectNoHorizontalOverflow,
  hasSupabaseEnv
} from "./helpers";

const expectedTitle = "きめのすけ | Clarity Before Choice";

async function expectHeaderStructure(
  page: Page,
  navigationName?: "候補一覧" | "一覧に戻る"
) {
  const header = page.locator("header.brand-header");
  const tagline = header.getByText("Clarity Before Choice", { exact: true });
  const brand = header.getByRole("link", { name: "きめのすけ", exact: true });
  const slot = header.getByTestId("brand-header-navigation-slot");

  await expect(tagline).toBeVisible();
  await expect(header).toHaveAttribute("aria-label", "ブランドヘッダー");
  await expect(tagline).toHaveCSS("font-family", 'Georgia, "Times New Roman", serif');
  await expect(tagline).toHaveCSS("font-style", "italic");
  await expect(tagline).toHaveCSS("white-space", "nowrap");
  await expect(tagline.locator("a,button,[tabindex]")).toHaveCount(0);
  await expect(brand).toHaveAttribute("href", "/");
  await expect(slot).toHaveCount(1);

  const directChildren = header.locator(":scope > *");
  await expect(directChildren).toHaveCount(3);
  await expect(directChildren).toHaveText([
    "Clarity Before Choice",
    "きめのすけ",
    navigationName ?? ""
  ]);

  if (navigationName) {
    await expect(slot.getByRole("link", { name: navigationName, exact: true })).toBeVisible();
  } else {
    await expect(slot.locator("a,button,input,select,textarea,[tabindex]")).toHaveCount(0);
  }

  return { brand, header, slot, tagline };
}

async function expectTrueCenter(page: Page, header: Locator, brand: Locator) {
  const centers = await header.evaluate((headerElement) => {
    const brandElement = headerElement.querySelector(".brand");
    if (!(brandElement instanceof HTMLElement)) throw new Error("Brand link is missing.");
    const headerBox = headerElement.getBoundingClientRect();
    const brandBox = brandElement.getBoundingClientRect();
    return {
      difference: Math.abs(
        headerBox.left + headerBox.width / 2 - (brandBox.left + brandBox.width / 2)
      )
    };
  });
  expect(centers.difference).toBeLessThanOrEqual(1);
  await expect(brand).toBeVisible();
}

async function expectStackedOrder(
  tagline: Locator,
  brand: Locator,
  navigation?: Locator
) {
  const boxes = await Promise.all([
    tagline.boundingBox(),
    brand.boundingBox(),
    navigation?.boundingBox()
  ]);
  const [taglineBox, brandBox, navigationBox] = boxes;
  expect(taglineBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(taglineBox!.y).toBeLessThan(brandBox!.y);
  if (navigation) {
    expect(navigationBox).not.toBeNull();
    expect(navigationBox!.y).toBeLessThan(brandBox!.y);
    expect(taglineBox!.x).toBeLessThan(navigationBox!.x);
  }
}

test("uses the shared brand header on the top page", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await expect(page).toHaveTitle(expectedTitle);

  const { brand, header, slot, tagline } = await expectHeaderStructure(page);
  await expect(brand).toHaveAttribute("aria-current", "page");
  await expect(slot).toHaveText("");
  await expectTrueCenter(page, header, brand);
  await expectStackedOrder(tagline, brand);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("top-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await expectTrueCenter(page, header, brand);
  await expectStackedOrder(tagline, brand);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("top-mobile.png"), fullPage: true });

  await page.goto("/b3-not-found-check");
  await expect(page).toHaveTitle(expectedTitle);
});

test("keeps the brand header contract across all event view modes", async (
  { browser, page },
  testInfo
) => {
  test.skip(!hasSupabaseEnv, "Supabase local profile is required.");
  const unique = Date.now();
  const created = await createEvent(page, `[E2E] B3 header ${unique}`);

  let header = await expectHeaderStructure(page, "候補一覧");
  await expect(header.brand).not.toHaveAttribute("aria-current", "page");
  await expect(page).toHaveTitle(expectedTitle);

  const loadingContext = await browser.newContext({ javaScriptEnabled: false });
  const loadingPage = await loadingContext.newPage();
  await loadingPage.goto(created.shareUrl);
  await expect(loadingPage.getByText("読み込み中...", { exact: true })).toBeVisible();
  await expectHeaderStructure(loadingPage, "候補一覧");

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(created.shareUrl);
  await expect(guestPage.getByRole("heading", { name: "あなたのお名前" })).toBeVisible();
  await expectHeaderStructure(guestPage, "候補一覧");

  await page.getByRole("link", { name: "候補一覧", exact: true }).click();
  header = await expectHeaderStructure(page);
  await expect(header.brand).not.toHaveAttribute("aria-current", "page");

  const candidateName = `[E2E] B3 candidate ${unique}`;
  await addCandidate(page, candidateName);
  await page.getByRole("link", { name: candidateName, exact: true }).click();
  header = await expectHeaderStructure(page, "一覧に戻る");
  await expect(header.brand).not.toHaveAttribute("aria-current", "page");

  await page.setViewportSize({ width: 1366, height: 768 });
  await expectTrueCenter(page, header.header, header.brand);
  const detailNavigation = header.slot.getByRole("link", {
    name: "一覧に戻る",
    exact: true
  });
  await expectStackedOrder(header.tagline, header.brand, detailNavigation);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("candidate-detail-desktop.png"),
    fullPage: true
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await expectTrueCenter(page, header.header, header.brand);
  await expectStackedOrder(header.tagline, header.brand, detailNavigation);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("candidate-detail-mobile.png"),
    fullPage: true
  });
  await page.setViewportSize({ width: 320, height: 812 });
  await expectNoHorizontalOverflow(page);
  await expect(header.tagline).toBeVisible();
  await expect(header.brand).toBeVisible();
  const compactNavigation = detailNavigation;
  await expect(compactNavigation).toBeVisible();
  await expectStackedOrder(header.tagline, header.brand, compactNavigation);

  await loadingContext.close();
  await guestContext.close();
});
