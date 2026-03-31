import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

const BLACKPOOL_TEXT = `🎢COASTAL BRRR DEAL ALL MONEY OUT 🐟🐠

📍Blackpool

🐠Purchase:£100,000
👷‍♂️Refurb:£30,000
🐠End value:£177,000

🐠Mortgage valuation to hand 🤝

👷‍♂️Refurb team on hand

Message or call today to secure
+447397564835`;

async function adminLogin(page: import("@playwright/test").Page) {
  await page.goto("/signin");
  await page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]').fill(ADMIN_EMAIL);
  await page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]').fill(ADMIN_PASS);
  await page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]').click();
  // Wait for redirect away from signin
  await page.waitForURL((url) => !url.pathname.includes("/signin"), {
    timeout: 30000,
  });
}

test.describe("Quick Listing QA - Local", () => {
  test.use({ baseURL: "http://localhost:5173" });

  test("Test 1: Quick listing defaults - parse Blackpool text", async ({
    page,
  }) => {
    await adminLogin(page);

    // Navigate to admin quick list page
    await page.goto("/admin/marketplace/quick-list");
    await page.waitForLoadState("networkidle");

    // Find the textarea and paste text
    const textarea = page.locator(
      '[data-feature="ADMIN__QUICK_LIST_INPUT"]'
    );
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.fill(BLACKPOOL_TEXT);

    // Click Generate Listing button
    const parseBtn = page.locator(
      '[data-feature="ADMIN__QUICK_LIST_PARSE"]'
    );
    await parseBtn.click();

    // Wait for parsing to complete - the preview panel should appear
    const preview = page.locator(
      '[data-feature="ADMIN__QUICK_LIST_PREVIEW"]'
    );
    await expect(preview).toBeVisible({ timeout: 30000 });

    // Check postcode field shows "N/A" (not empty)
    const postcodeInput = preview.locator(
      'label:has-text("Postcode") + input, label:has-text("Postcode") ~ input'
    );
    // Fallback: find by label text within preview
    const postcodeLabel = preview.locator("text=Postcode").first();
    await expect(postcodeLabel).toBeVisible();
    // The input right after the postcode label
    const postcodeField = postcodeLabel
      .locator("xpath=ancestor::div[1]")
      .locator("input");
    await expect(postcodeField).toHaveValue("N/A");

    // Check Type field shows something (House expected)
    const typeLabel = preview.locator("text=Type").first();
    const typeField = typeLabel
      .locator("xpath=ancestor::div[1]")
      .locator("select, input");
    const typeValue = await typeField.inputValue();
    expect(typeValue).toBeTruthy();
    // Could be "house" in the select
    console.log("Type value:", typeValue);

    // Check city shows Blackpool
    const cityLabel = preview.locator("text=City").first();
    const cityField = cityLabel
      .locator("xpath=ancestor::div[1]")
      .locator("input");
    await expect(cityField).toHaveValue("Blackpool");

    // Check contact phone shows +447397564835
    const phoneLabel = preview.locator("text=Phone").first();
    const phoneField = phoneLabel
      .locator("xpath=ancestor::div[1]")
      .locator("input");
    const phoneValue = await phoneField.inputValue();
    expect(phoneValue).toContain("447397564835");

    await page.screenshot({
      path: "e2e/screenshots/test1-quick-listing-defaults.png",
      fullPage: true,
    });
  });

  test("Test 2: Deal detail - sale vs rent label", async ({ page }) => {
    await adminLogin(page);

    // Go to deals list
    await page.goto("/dashboard/deals");
    await page.waitForLoadState("networkidle");

    // Wait for the deals grid to appear
    const grid = page.locator('[data-feature="DEALS__GRID"]');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Wait for at least one "View Deal" link to appear
    const viewDealLinks = page.locator(
      '[data-feature="DEALS__PROPERTY_CARD_VIEW"]'
    );
    const linkCount = await viewDealLinks.count();
    if (linkCount === 0) {
      test.skip(true, "No deals found on the page");
      return;
    }

    // Click the first View Deal link
    await viewDealLinks.first().click();

    // Wait for deal detail page to load (wait for "Loading deal..." to disappear)
    await page.waitForFunction(
      () => !document.body.textContent?.includes("Loading deal"),
      { timeout: 20000 }
    );
    await page.waitForTimeout(1000);

    // Check if the page has either "Monthly rent" or "Sale price"
    const monthlyRent = page.locator("text=Monthly rent");
    const salePrice = page.locator("text=Sale price");

    const hasRentLabel = (await monthlyRent.count()) > 0;
    const hasSaleLabel = (await salePrice.count()) > 0;

    // At least one label should be present
    expect(hasRentLabel || hasSaleLabel).toBeTruthy();

    if (hasRentLabel) {
      console.log("PASS: Found 'Monthly rent' label on deal detail");
    }
    if (hasSaleLabel) {
      console.log("PASS: Found 'Sale price' label on deal detail");
    }

    await page.screenshot({
      path: "e2e/screenshots/test2-deal-detail-label.png",
      fullPage: true,
    });
  });

  test("Test 3: Deposit not required", async ({ page }) => {
    await adminLogin(page);

    await page.goto("/dashboard/list-a-deal");
    await page.waitForLoadState("networkidle");

    // Open the Financials accordion section
    const financialsSection = page.locator("text=Financials").first();
    await financialsSection.click();
    await page.waitForTimeout(500);

    // Find the deposit label and input
    const depositLabel = page.locator(
      'label:has-text("Deposit")'
    );
    await expect(depositLabel).toBeVisible({ timeout: 10000 });

    // Check the label does NOT have an asterisk
    const labelText = await depositLabel.textContent();
    expect(labelText).not.toContain("*");
    console.log("Deposit label text:", labelText);

    // Find the deposit input (the number input near the Deposit label)
    const depositInput = depositLabel
      .locator("xpath=ancestor::div[1]")
      .locator('input[type="number"]');
    await expect(depositInput).toBeVisible();

    // Check it does NOT have required attribute
    const isRequired = await depositInput.getAttribute("required");
    expect(isRequired).toBeNull();

    await page.screenshot({
      path: "e2e/screenshots/test3-deposit-not-required.png",
      fullPage: true,
    });
  });

  test("Test 4: AI toggle stays on after parsing", async ({ page }) => {
    await adminLogin(page);

    await page.goto("/dashboard/list-a-deal");
    await page.waitForLoadState("networkidle");

    // Find and turn on the AI Quick Listing toggle
    const aiToggle = page.locator(
      '[data-feature="DEALS__LIST_AI_TOGGLE"]'
    );
    await expect(aiToggle).toBeVisible({ timeout: 10000 });

    // Check if it's already on
    const isChecked = await aiToggle.isChecked();
    if (!isChecked) {
      await aiToggle.click();
    }

    // Verify toggle is on
    await expect(aiToggle).toBeChecked();

    // Find the AI text area and paste text
    const aiInput = page.locator(
      '[data-feature="DEALS__LIST_AI_INPUT"]'
    );
    await expect(aiInput).toBeVisible({ timeout: 5000 });
    await aiInput.fill(BLACKPOOL_TEXT);

    // Click Parse with AI
    const parseBtn = page.locator(
      '[data-feature="DEALS__LIST_AI_PARSE"]'
    );
    await parseBtn.click();

    // Wait for parsing to complete (button text changes back from "Parsing...")
    await expect(parseBtn).not.toContainText("Parsing", { timeout: 30000 });

    // Verify the AI toggle is STILL on
    await expect(aiToggle).toBeChecked();
    console.log("PASS: AI toggle remained ON after parsing");

    await page.screenshot({
      path: "e2e/screenshots/test4-ai-toggle-stays-on.png",
      fullPage: true,
    });
  });

  test("Test 5: Landlord contact fields on admin quick list", async ({
    page,
  }) => {
    await adminLogin(page);

    await page.goto("/admin/marketplace/quick-list");
    await page.waitForLoadState("networkidle");

    // Paste and parse the Blackpool text
    const textarea = page.locator(
      '[data-feature="ADMIN__QUICK_LIST_INPUT"]'
    );
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.fill(BLACKPOOL_TEXT);

    const parseBtn = page.locator(
      '[data-feature="ADMIN__QUICK_LIST_PARSE"]'
    );
    await parseBtn.click();

    // Wait for preview
    const preview = page.locator(
      '[data-feature="ADMIN__QUICK_LIST_PREVIEW"]'
    );
    await expect(preview).toBeVisible({ timeout: 30000 });

    // Check for Landlord Contact section
    const contactSection = preview.locator("text=Landlord Contact");
    await expect(contactSection).toBeVisible();

    // Check Contact Name field exists
    const nameLabel = preview.locator('label:has-text("Name")').first();
    await expect(nameLabel).toBeVisible();
    const nameInput = nameLabel
      .locator("xpath=ancestor::div[1]")
      .locator("input");
    await expect(nameInput).toBeVisible();
    const nameValue = await nameInput.inputValue();
    console.log("Contact Name:", nameValue || "(empty)");

    // Check Contact Phone field shows +447397564835
    const phoneLabel = preview
      .locator('label:has-text("Phone")')
      .first();
    await expect(phoneLabel).toBeVisible();
    const phoneInput = phoneLabel
      .locator("xpath=ancestor::div[1]")
      .locator("input");
    await expect(phoneInput).toBeVisible();
    const phoneValue = await phoneInput.inputValue();
    expect(phoneValue).toContain("447397564835");
    console.log("Contact Phone:", phoneValue);

    // Check Contact Email field exists
    const emailLabel = preview
      .locator('label:has-text("Email")')
      .first();
    await expect(emailLabel).toBeVisible();
    const emailInput = emailLabel
      .locator("xpath=ancestor::div[1]")
      .locator("input");
    await expect(emailInput).toBeVisible();
    const emailValue = await emailInput.inputValue();
    console.log("Contact Email:", emailValue || "(empty)");

    await page.screenshot({
      path: "e2e/screenshots/test5-landlord-contact-fields.png",
      fullPage: true,
    });
  });
});
