import { test, expect } from "@playwright/test";

const AGREEMENT_URL = "https://hub.nfstay.com/agreement/mark-01";

test.setTimeout(60000);

test.describe("Agreement page — draft v2 content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AGREEMENT_URL, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toBeVisible({ timeout: 20000 });
  });

  test("title says 'Property Serviced Accommodation'", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Property Serviced Accommodation Partnership Agreement");
  });

  test("preamble references full agreement at docs.nfstay.com", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("docs.nfstay.com");
  });

  test("company number is 13806307", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("13806307");
    expect(body).not.toContain("15601077");
  });

  test("entity name is Nfstay Holdings FZE LLC", async ({ page }) => {
    await expect(page.locator("text=Nfstay Holdings FZE LLC").first()).toBeVisible();
  });

  test("section 1 — Platform Operator and Property Manager roles", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("Property Manager");
    expect(body).toContain("Platform Operator");
  });

  test("section 1 — IP rights retained by Company", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("intellectual property rights");
  });

  test("section 1 — references full agreement sections", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("Sections 1, 8 and 23 of the full Agreement");
  });

  test("section 3 — Indicative Net Yield field present", async ({ page }) => {
    await expect(page.locator("text=Indicative Net Yield").first()).toBeVisible();
  });

  test("section 3 — contributions non-transferable without written consent", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("without the prior written consent of the Company");
  });

  test("section 4 — market data disclaimer present", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("illustrative only");
    expect(body).toContain("not a forecast, projection, or guarantee");
  });

  test("section 5 — Nfstay Holdings continues if Airbrick replaced", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("Nfstay Holdings");
    expect(body).toContain("continue to administer governance and distributions");
  });

  test("section 6 — Force Majeure risk factor", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("Force Majeure");
    expect(body).toContain("pandemics");
    expect(body).toContain("cyber");
  });

  test("section 6 — No Reliance on Informal Communications", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("No Reliance on Informal Communications");
    expect(body).toContain("WhatsApp message");
  });

  test("section 7 — not a token sale acknowledgement", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("not a token sale");
  });

  test("section 7 — banking details responsibility", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("bank details current and secure");
  });

  test("section 8 — no crypto tax treatment clause", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("No crypto or token tax treatment");
    expect(body).toContain("operational record-keeping");
  });

  test("section 9 — liability cap present", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("shall not exceed the amount of the Partner");
    expect(body).toContain("less any distributions already received");
  });

  test("section 9 — carve-out for fraud", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("fraud");
    expect(body).toContain("wilful misconduct");
  });

  test("section 10 — dissolution pro-rata distribution", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("pro-rata");
  });

  test("section 11 — ICC arbitration in Dubai", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("International Chamber of Commerce");
    expect(body).toContain("Dubai");
  });

  test("section 12 — electronic signature clause", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("electronic signature");
    expect(body).toContain("same legal effect as a handwritten signature");
  });

  test("nav labels match new sections", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.locator("text=Partnership Contribution")).toBeVisible();
    await expect(nav.locator("text=Market Data")).toBeVisible();
  });

  test("dual currency still works (= ~£ format)", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("= ~£");
  });
});
