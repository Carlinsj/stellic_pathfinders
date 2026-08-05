import { expect, test } from '@playwright/test';

test('visual smoke capture has meaningful rendered content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'desktop visual capture');
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/campusfit-landing.png', fullPage: true });
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await expect(page.getByRole('heading', { name: /Good evening, Maya/ })).toBeVisible();
  await expect(page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/campusfit-home.png', fullPage: true });
  expect(await page.locator('body').innerText()).toContain('CampusFit');
  await page.goto('/nyu/facilities/nyu_paulson');
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  await expect(page.getByText(/Your best bet is around/i)).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-facility-later.png', fullPage: true });
  await page.goto('/nyu/home');
  await page.getByRole('link', { name: 'Demand', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Equipment status for Back' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-equipment-status.png', fullPage: true });
  await page.getByRole('link', { name: 'Plan' }).first().click();
  await page.getByRole('button', { name: 'Activity only' }).click();
  await expect(page.getByLabel('Choose your activity')).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-activity-plan.png', fullPage: true });
  await page.locator('.student-profile-action').click();
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Sam Ortiz/ }).click();
  await expect(page.getByRole('heading', { name: 'Record completed repair' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-staff-repair-flow.png', fullPage: true });
  await page.locator('.sidebar-user button').click();
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Taylor Morgan/ }).click();
  await expect(page.locator('.admin-console-header')).toContainText('University settings');
  await page.screenshot({ path: 'test-results/campusfit-admin-console.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test('student home is overflow-free at required product widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single cross-viewport audit');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();

  for (const width of [375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.goto('/nyu/home');
    await expect(page.getByRole('heading', { name: /Good evening, Maya/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (width < 961) {
      const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
      await expect(mobileNavigation).toBeVisible();
      if (width === 390) {
        const recommendationAction = page.locator('.recommendation-hero .button--primary');
        const [actionBounds, navigationBounds] = await Promise.all([recommendationAction.boundingBox(), mobileNavigation.boundingBox()]);
        expect(actionBounds).not.toBeNull();
        expect(navigationBounds).not.toBeNull();
        expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(navigationBounds!.y);
      }
    }
    else await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await page.screenshot({ path: `test-results/campusfit-home-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nyu/facilities/nyu_paulson');
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  const facilityOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(facilityOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/campusfit-facility-later-390.png', fullPage: true });
  await page.goto('/nyu/home');
  await page.getByRole('button', { name: 'I’m here', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(dialogBounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/campusfit-checkin-sheet-390.png' });
});
