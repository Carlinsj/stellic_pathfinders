import { expect, signInStudent, test } from './fixtures';

async function createUpcomingWorkout(page: import('@playwright/test').Page) {
  await signInStudent(page);
  await page.goto('/nyu/plan?facility=nyu_paulson&focus=back');
  const continueButton = page.getByRole('button', { name: /Continue/ });
  await continueButton.click();
  const arrivalTime = await page.evaluate(() => {
    const date = new Date(Date.now() + 60 * 60_000);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });
  await page.getByLabel('Arrival time').fill(arrivalTime);
  await continueButton.click();
  await page.getByRole('button', { name: /Paulson/ }).click();
  await continueButton.click();
  await page.getByRole('button', { name: 'Save visit plan', exact: true }).click();
  await expect(page.locator('.upcoming-strip')).toBeVisible();
}

test.describe('upcoming visit management', () => {
  test('reschedules a workout to an exact earlier or later time', async ({ page }) => {
    await createUpcomingWorkout(page);
    const manageButton = page.getByRole('button', { name: 'Manage plan' });
    await manageButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Manage your workout' })).toBeVisible();
    await expect(dialog).toContainText('Rescheduling updates your planned contribution');
    const saveButton = dialog.getByRole('button', { name: /Save new time/ });
    await expect(saveButton).toBeDisabled();

    const newArrival = await page.evaluate(() => {
      const date = new Date(Date.now() + 2 * 60 * 60_000);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 16);
    });
    await dialog.getByLabel('New arrival date and time').fill(newArrival);
    await saveButton.click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Workout rescheduled');
    await expect(page.locator('.upcoming-strip')).toContainText('Updated arrival');
  });

  test('requires explicit confirmation before cancelling a workout', async ({ page }) => {
    await createUpcomingWorkout(page);
    await page.getByRole('button', { name: 'Manage plan' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Cancel this workout/ }).click();
    await expect(dialog.getByRole('heading', { name: 'Cancel this workout?' })).toBeVisible();
    await expect(dialog).toContainText('no longer contribute to scheduled participation');

    await dialog.getByRole('button', { name: 'Keep workout' }).click();
    await expect(dialog.getByRole('heading', { name: 'Manage your workout' })).toBeVisible();
    await dialog.getByRole('button', { name: /Cancel this workout/ }).click();
    await dialog.getByRole('button', { name: 'Yes, cancel workout' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.upcoming-strip')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Workout cancelled');
  });

  test('keeps the management flow usable on a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await createUpcomingWorkout(page);
    const manageButton = page.getByRole('button', { name: 'Manage plan' });
    await manageButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('New arrival date and time')).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Cancel this workout/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(manageButton).toBeFocused();
  });
});
