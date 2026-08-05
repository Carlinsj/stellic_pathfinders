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
  await page.getByRole('link', { name: 'Equipment' }).click();
  await expect(page.getByRole('heading', { name: 'Equipment status for Back' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-equipment-status.png', fullPage: true });
  await page.getByRole('link', { name: 'Plan' }).first().click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: 'Activity only' }).click();
  await expect(page.getByLabel('Choose your activity')).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-activity-plan.png', fullPage: true });
  await page.locator('.sidebar-user button').click();
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Taylor Morgan/ }).click();
  await expect(page.locator('.admin-console-header')).toContainText('University settings');
  await page.screenshot({ path: 'test-results/campusfit-admin-console.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
});
