import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("runs the complete NYU Room 202 to Room 815 flow", async ({ page }) => {
  await page.goto("/nyu/student");
  await expect(page.getByRole("heading", { name: "Good morning, Maya." })).toBeVisible();
  await expect(page.getByText("2 MetroTech Center · 202")).toBeVisible();

  await page.goto("/nyu/admin");
  await page.getByRole("button", { name: /Run NYU competition demo/ }).click();
  await expect(page.getByRole("heading", { name: "815 needs action" })).toBeVisible();
  await expect(page.getByText("812", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: /Open room-change alert/ }).click();
  await expect(page.getByRole("heading", { name: "This room change needs action" })).toBeVisible();
  await expect(page.getByText("4 required features need action")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Move the class to 812" })).toBeVisible();

  await page.getByRole("link", { name: /Compare rooms/ }).click();
  await expect(page.getByText("BEST COMPATIBLE ALTERNATIVE")).toBeVisible();
  await expect(page.locator(".best-room-card h2")).toHaveText("812");

  await page.goto("/nyu/admin/case");
  await expect(page.getByText("Moses Center coordinator reviews")).toBeVisible();
  await page.getByRole("button", { name: /Confirm & resolve/ }).click();
  await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();

  await page.goto("/nyu/admin/notifications");
  await page.getByRole("button", { name: /Instructor notice/ }).click();
  const preview = page.locator(".message-preview");
  await expect(preview).toContainText("Moses Center for Student Accessibility");
  await expect(preview).not.toContainText("Maya");
  await expect(preview).not.toContainText("adjustable desk");
});

test("runs the complete UIUC DCL 1320 to DCL 1310 flow with a distinct workflow", async ({
  page,
}) => {
  await page.goto("/uiuc/student");
  await expect(page.getByRole("heading", { name: "Good morning, Jordan." })).toBeVisible();
  await expect(page.getByText("Digital Computer Laboratory · DCL 1320")).toBeVisible();
  await expect(page.getByText("Arm-free classroom chair")).toBeVisible();

  await page.goto("/uiuc/admin");
  await page.getByRole("button", { name: /Run Illinois competition demo/ }).click();
  await expect(page.getByRole("heading", { name: "DCL 1310 needs action" })).toBeVisible();
  await expect(page.locator(".best-alternative strong").first()).toHaveText("DCL 1327");

  await page.goto("/uiuc/admin/case");
  await expect(page.getByText("DRES reviews the impact")).toBeVisible();
  await expect(page.getByText("Facilities verifies the missing feature")).toBeVisible();
  await expect(page.getByText("Classroom Scheduling selects a replacement")).toBeVisible();

  await page.goto("/uiuc/admin/notifications");
  await page.getByRole("button", { name: /Instructor notice/ }).click();
  const preview = page.locator(".message-preview");
  await expect(preview).toContainText("Disability Resources and Educational Services");
  await expect(preview).not.toContainText("Jordan");
});

test("switches tenants without exposing stale tenant data", async ({ page }) => {
  await page.goto("/nyu/admin");
  await page.getByRole("button", { name: /Run NYU competition demo/ }).click();
  await expect(page.getByRole("heading", { name: "815 needs action" })).toBeVisible();

  const openNavigation = page.getByRole("button", { name: "Open navigation" });
  if (await openNavigation.isVisible()) await openNavigation.click();
  await page.getByLabel("Switch competition demo persona").selectOption("uiuc-student-demo");
  await expect(page).toHaveURL(/\/uiuc\/student$/);
  await expect(page.getByRole("heading", { name: "Good morning, Jordan." })).toBeVisible();
  await expect(page.getByText("Maya Chen")).toHaveCount(0);
  await expect(page.getByText("All upcoming classrooms are ready")).toBeVisible();
});

test("renames a feature, reorders a workflow step, previews, publishes, and resets", async ({
  page,
}) => {
  await page.goto("/nyu/admin/setup");
  await page.getByRole("button", { name: /Feature catalogue/ }).click();
  const featureName = page.getByLabel("Display name for adjustable_desk");
  await featureName.fill("Adjustable demo workstation");

  await page.getByRole("button", { name: /Resolution workflow/ }).click();
  await page.getByRole("button", { name: /Move Moses Center coordinator reviews down/ }).click();
  await expect(page.locator(".workflow-editor li").nth(2)).toContainText(
    "Moses Center coordinator reviews",
  );

  await page.getByRole("button", { name: /Preview/ }).click();
  await expect(page.locator(".setup-preview")).toContainText("Adjustable demo workstation");

  await page.getByRole("button", { name: /Publish/ }).click();
  await page.getByRole("button", { name: /Publish in demo mode/ }).click();
  await expect(page.getByText("NYU configuration published in demo mode.")).toBeVisible();

  const openNavigation = page.getByRole("button", { name: "Open navigation" });
  if (await openNavigation.isVisible()) await openNavigation.click();
  await page.getByRole("button", { name: /Reset All Demo Data/ }).click();
  await page.goto("/nyu/admin/setup");
  await page.getByRole("button", { name: /Feature catalogue/ }).click();
  await expect(page.getByLabel("Display name for adjustable_desk")).toHaveValue(
    "Height-adjustable student desk",
  );
});

test("rejects an unknown university slug", async ({ page }) => {
  await page.goto("/unknown/student");
  await expect(page.getByRole("heading", { name: "University workspace unavailable" })).toBeVisible();
  await expect(page.getByText("That university workspace is not available.")).toBeVisible();
});

test("public and tenant pages have no serious or critical automated accessibility findings", async ({
  page,
}) => {
  for (const route of ["/", "/nyu/student", "/uiuc/admin/setup"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(blocking, `${route}: ${blocking.map((issue) => issue.id).join(", ")}`).toEqual([]);
  }
});
