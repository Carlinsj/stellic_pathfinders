import { expect, test } from './fixtures';

const campusCheckIns = (page: import('@playwright/test').Page) => page.locator('.student-overview article').filter({ hasText: /currently checked in/ }).locator('strong');

async function checkInAtPalladium(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Palladium/ }).click();
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: '45 min', exact: true }).click();
  await dialog.getByRole('button', { name: /Review/ }).click();
  await dialog.getByRole('button', { name: 'Check in', exact: true }).click();
  await dialog.getByRole('button', { name: /View active visit/ }).click();
}

test('demo tabs preserve separate users while synchronizing check-ins and checkouts', async ({ context, page }) => {
  const theoPage = await context.newPage();
  await Promise.all([page.goto('/nyu/login'), theoPage.goto('/nyu/login')]);

  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await expect(page.getByRole('heading', { name: /Maya/ })).toBeVisible();

  await theoPage.getByRole('button', { name: /Theo Rivera/ }).click();
  await expect(theoPage.getByRole('heading', { name: /Theo/ })).toBeVisible();

  const initialCount = Number(await campusCheckIns(theoPage).innerText());
  await checkInAtPalladium(page);

  await expect.poll(async () => Number(await campusCheckIns(theoPage).innerText())).toBe(initialCount + 1);
  await expect(theoPage.getByRole('heading', { name: /Theo/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Maya/ })).toBeVisible();

  await theoPage.goto('/nyu/facilities/nyu_palladium');
  await expect.poll(async () => Number(await theoPage.locator('.now-checkin-value').innerText())).toBeGreaterThanOrEqual(1);

  await page.locator('.active-visit-card').getByRole('button', { name: /Wrap up workout/ }).click();
  await theoPage.goto('/nyu/home');
  await expect.poll(async () => Number(await campusCheckIns(theoPage).innerText())).toBe(initialCount);
  await theoPage.close();
});
