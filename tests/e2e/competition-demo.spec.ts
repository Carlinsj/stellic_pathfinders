import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("runs the complete Room 202 to Room 815 competition flow", async ({ page }) => {
  await page.getByRole("link", { name: "Run competition demo" }).click();
  await expect(page).toHaveURL(/\/admin\/simulator$/);

  await page.getByRole("button", { name: /Run competition demo/ }).click();
  await expect(page.getByRole("heading", { name: "Room 815 needs action" })).toBeVisible();
  await expect(page.getByText("Room 812 recommended")).toBeVisible();

  await page.getByRole("link", { name: /Open room-change alert/ }).click();
  await expect(page.getByRole("heading", { name: "This room change needs action" })).toBeVisible();
  await expect(page.getByText("4 required features need action")).toBeVisible();
  await expect(page.getByText("Move the class to Room 812")).toBeVisible();

  await page.getByRole("link", { name: /Compare rooms/ }).click();
  await expect(page.getByText("Best compatible alternative")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Room 812", exact: true }),
  ).toBeVisible();

  await page.goto("/app/case");
  await page.getByRole("button", { name: /Confirm & resolve/ }).click();
  await expect(page.getByText("Resolved", { exact: true })).toBeVisible();

  await page.goto("/notifications");
  await page.getByRole("button", { name: /Instructor notice/ }).click();
  const preview = page.locator(".message-preview");
  await expect(preview).toContainText("approved classroom-access requirement");
  await expect(preview).not.toContainText("Maya");
  await expect(preview).not.toContainText("adjustable desk");
});

test("reset restores the original compatible assignment", async ({ page }) => {
  await page.goto("/admin/simulator");
  await page.getByRole("button", { name: /Run competition demo/ }).click();
  await expect(page.getByRole("heading", { name: "Room 815 needs action" })).toBeVisible();
  await page.locator("#main-content").getByRole("button", { name: /Reset demo/ }).click();
  await expect(page.getByRole("heading", { name: "Ready for the room change" })).toBeVisible();

  await page.goto("/app");
  await expect(page.getByText("Room 202")).toBeVisible();
  await expect(page.getByText("All upcoming classrooms are ready")).toBeVisible();
});

test("landing page has no serious or critical automated accessibility findings", async ({
  page,
}) => {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  expect(blocking).toEqual([]);
});
