import { expect, test } from "@playwright/test";

// One deterministic golden path across modules. Trainer is excluded (needs a
// webcam); diet is excluded (needs profile setup) — both are covered by the
// backend integration tests. Chat uses the offline rule-based fallback, which
// playwright.config.ts guarantees by pinning OPENROUTER_API_KEY to empty.
test("register -> dashboard -> chat -> performance", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = "password123";

  // Register (auto-logs-in and navigates to /app).
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  // Landed on the dashboard.
  await expect(page).toHaveURL(/\/app$/);

  // Chat: send a message and get a reply.
  await page.goto("/app/chat");
  await page.getByPlaceholder("Type a message…").fill("I feel tired today");
  await page.getByRole("button", { name: "Send" }).click();
  // The user bubble appears, then the assistant reply (fallback).
  await expect(page.getByText("I feel tired today")).toBeVisible();
  await expect(page.getByText("AI offline — basic reply")).toBeVisible();

  // Performance: a brand-new user has no sessions -> empty state.
  await page.goto("/app/performance");
  await expect(page.getByText(/No workouts yet/i)).toBeVisible();
});
