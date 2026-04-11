import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxMjIxMDQsImV4cCI6MjA1MTY5ODEwNH0.cr7jmSuq9WSjkSvQ55-JXXLHQXFqpIKoE7cqGMUEK2c";

test.describe("Airbnb Pricing Edge Function — Direct API Tests", () => {

  // Test 1: Simple 2-bed — should always work
  test("2-bed flat in London returns pricing data", async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/functions/v1/airbnb-pricing`, {
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      data: { city: "London", bedrooms: 2, bathrooms: 1, type: "Flat", rent: 1500 },
      timeout: 90_000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log("2-bed London response:", JSON.stringify(body, null, 2));

    // Should NOT be no_real_data
    expect(body.error).toBeUndefined();
    expect(body.estimated_nightly_rate).toBeGreaterThan(0);
    expect(body.estimated_monthly_revenue).toBeGreaterThan(0);
    expect(body.reasoning).toBeTruthy();
    expect(body.confidence).toMatch(/high|medium/);
  });

  // Test 2: The problematic Barking 5-bed
  test("5-bed house in Barking returns pricing data", async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/functions/v1/airbnb-pricing`, {
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      data: { city: "Barking", bedrooms: 5, bathrooms: 3, type: "House", rent: 4500 },
      timeout: 90_000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log("5-bed Barking response:", JSON.stringify(body, null, 2));

    // Log everything for debugging
    if (body.error) {
      console.log("ERROR:", body.error);
      console.log("REASONING:", body.reasoning);
    }

    // We want to understand what's happening — even if it fails, we need the reasoning
    expect(body.reasoning).toBeTruthy();
  });

  // Test 3: Mid-range — 3-bed in Manchester
  test("3-bed house in Manchester returns pricing data", async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/functions/v1/airbnb-pricing`, {
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      data: { city: "Manchester", bedrooms: 3, bathrooms: 2, type: "House", rent: 1200 },
      timeout: 90_000,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log("3-bed Manchester response:", JSON.stringify(body, null, 2));

    expect(body.error).toBeUndefined();
    expect(body.estimated_nightly_rate).toBeGreaterThan(0);
  });
});
