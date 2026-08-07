import { expect, signInStudent, test } from './fixtures';

async function openQuickCheckIn(page: import('@playwright/test').Page) {
  const trigger = page.getByRole('button', { name: 'I’m here', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return { dialog, trigger };
}

test.describe('student planning, visits, demand, and privacy', () => {
  test('planning always keeps a workout focus and activity-only always has an activity', async ({ page }) => {
    await signInStudent(page);
    await page.getByRole('link', { name: 'Plan' }).first().click();
    const continueButton = page.getByRole('button', { name: /Continue/ });
    const focusPicker = page.getByRole('group', { name: 'Muscle groups' });

    await focusPicker.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(focusPicker.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(continueButton).toBeEnabled();

    await page.getByRole('button', { name: 'Activity only' }).click();
    await expect(page.getByLabel('Choose your activity')).not.toHaveValue('');
    await expect(continueButton).toBeEnabled();

    await page.getByRole('button', { name: 'Workout', exact: true }).click();
    await expect(focusPicker.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await focusPicker.getByRole('button', { name: 'Legs', exact: true }).click();
    await expect(continueButton).toBeEnabled();
  });

  test('query suggestions, custom dates, back navigation, and cancellation preserve the draft', async ({ page }) => {
    await signInStudent(page);
    await page.goto('/nyu/plan?focus=chest,legs&facility=nyu_paulson&time=19:15');
    const focusPicker = page.getByRole('group', { name: 'Muscle groups' });
    await expect(focusPicker.getByRole('button', { name: 'Chest', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(focusPicker.getByRole('button', { name: 'Legs', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByLabel('Arrival time')).toHaveValue('19:15');
    await page.getByRole('button', { name: /Pick a date/ }).click();
    const date = page.getByLabel('Date');
    const minimumDate = await date.getAttribute('min');
    expect(minimumDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await date.fill(minimumDate!);

    await page.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByRole('button', { name: /Paulson/ })).toHaveClass(/is-selected/);
    await page.getByRole('button', { name: /Back/ }).click();
    await expect(page.getByLabel('Arrival time')).toHaveValue('19:15');
    await page.getByRole('button', { name: /Back/ }).click();
    await expect(focusPicker.getByRole('button', { name: 'Chest', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Cancel/ }).click();
    await expect(page).toHaveURL(/\/nyu\/home$/);
    await expect(page.locator('.upcoming-strip')).toHaveCount(0);
  });

  test('closed-time planning explains that no NYU gym is suitable', async ({ page }) => {
    await signInStudent(page);
    await page.getByRole('link', { name: 'Plan' }).first().click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByLabel('Arrival time').fill('02:00');
    await expect(page.getByText('No suitable NYU gym is open for this workout at the selected time.')).toBeVisible();
    await expect(page.locator('.suggested-time-grid button')).toHaveCount(3);
  });

  test('quick check-in dialog traps focus, closes with Escape, and restores its trigger', async ({ page }) => {
    await signInStudent(page);
    const { dialog, trigger } = await openQuickCheckIn(page);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.getByRole('button', { name: 'Close dialog' })).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('workout check-in validates focuses, preserves duration, updates live intent, and completes', async ({ page }) => {
    await signInStudent(page);
    const { dialog } = await openQuickCheckIn(page);
    await dialog.getByRole('button', { name: /Paulson/ }).click();
    await dialog.getByRole('button', { name: /Continue/ }).click();

    const focusPicker = dialog.getByRole('group', { name: 'Muscle groups' });
    await focusPicker.getByRole('button', { name: 'General workout', exact: true }).click();
    await expect(focusPicker.getByRole('button', { name: 'General workout', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await focusPicker.getByRole('button', { name: 'Chest', exact: true }).click();
    await focusPicker.getByRole('button', { name: 'General workout', exact: true }).click();
    await expect(focusPicker.getByRole('button', { name: 'Chest', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: /Continue/ }).click();
    await dialog.getByRole('button', { name: '75 min' }).click();
    await dialog.getByRole('button', { name: /Review/ }).click();
    await expect(dialog.locator('.checkin-review-card')).toContainText('Paulson');
    await expect(dialog.locator('.checkin-review-card')).toContainText('Chest');
    await expect(dialog.locator('.checkin-review-card')).toContainText('75 minutes');

    await dialog.getByRole('button', { name: /Back/ }).click();
    await expect(dialog.getByRole('button', { name: '75 min' })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: /Review/ }).click();
    await dialog.getByRole('button', { name: 'Check in', exact: true }).click();
    await dialog.getByRole('button', { name: /View active visit/ }).click();

    const active = page.locator('.active-visit-card');
    await expect(active).toContainText('Chest');
    await expect(page.getByRole('button', { name: 'Checked in' })).toBeDisabled();
    const liveFocuses = active.getByRole('group', { name: 'Update muscle groups' });
    await liveFocuses.getByRole('button', { name: 'Legs', exact: true }).click();
    await active.getByLabel('Active activity').selectOption('badminton');
    await expect(page.getByRole('status')).toContainText('Live activity demand updated');
    await active.getByRole('button', { name: /Wrap up workout/ }).click();
    await expect(active).toHaveCount(0);

    await page.getByRole('link', { name: 'Activity' }).first().click();
    const newest = page.locator('.history-list article').first();
    await expect(newest).toContainText('Chest + Legs');
    await expect(newest).toContainText('Actual');
    await expect(newest).toContainText('Expected');
  });

  test('active visits accept an exact extension and block a second check-in', async ({ page }) => {
    await signInStudent(page);
    const { dialog } = await openQuickCheckIn(page);
    await dialog.getByRole('button', { name: /Continue/ }).click();
    await dialog.getByRole('button', { name: /Continue/ }).click();
    await dialog.getByRole('button', { name: /Review/ }).click();
    await dialog.getByRole('button', { name: 'Check in', exact: true }).click();
    await dialog.getByRole('button', { name: /View active visit/ }).click();

    const finishInput = page.getByLabel('New finish time');
    const before = await finishInput.inputValue();
    const requested = await page.evaluate((value) => {
      const date = new Date(value);
      date.setMinutes(date.getMinutes() + 20);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 16);
    }, before);
    await finishInput.fill(requested);
    await page.getByRole('button', { name: 'Extend until this time' }).click();
    const after = await finishInput.inputValue();
    expect(Date.parse(after) - Date.parse(before)).toBe(20 * 60_000);
    await expect(page.getByRole('status')).toContainText('Visit extended until');
    await expect(page.locator('.active-visit-card').getByRole('button', { name: 'Extend 20 min' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Checked in' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /View active visit/ })).toBeVisible();
  });

  test('history deletion removes only the selected personal row', async ({ page }) => {
    await signInStudent(page);
    await page.goto('/nyu/history');
    const rows = page.locator('.history-list article');
    const before = await rows.count();
    expect(before).toBeGreaterThan(1);
    await rows.first().getByRole('button', { name: /Delete .* history/ }).click();
    await expect(rows).toHaveCount(before - 1);
    await expect(page.getByRole('status')).toContainText('Personal visit history deleted');
    await expect(page.getByText(/Deleting history does not attempt to remove already anonymized statistics/)).toBeVisible();
  });

  test('demand view honors query parameters and switches to activity-specific resources', async ({ page }) => {
    await signInStudent(page);
    await page.goto('/nyu/activity?facility=nyu_paulson&focus=legs');
    await expect(page.getByLabel('Facility')).toHaveValue('nyu_paulson');
    await expect(page.getByLabel('Workout focus')).toHaveValue('legs');
    await expect(page.getByRole('heading', { name: 'Equipment status for Legs' })).toBeVisible();
    await expect(page.locator('.demand-card-grid')).toContainText('Leg press machines');

    await page.getByRole('button', { name: 'Activity', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Equipment status/ })).toHaveCount(0);
    await expect(page.getByLabel('Activity')).toHaveValue('badminton');
    await expect(page.locator('.demand-card-grid')).toContainText('Badminton courts');
    await page.getByLabel('Activity').selectOption('squash');
    await expect(page.locator('.demand-card-grid')).toContainText('Squash courts');
    await expect(page.getByText(/ranges, not promises/)).toBeVisible();
  });

  test('facility pages preserve ranges, confidence, privacy suppression, and forecast outcomes', async ({ page }) => {
    await signInStudent(page);
    await page.getByRole('link', { name: 'Gyms' }).first().click();
    const cards = page.locator('.gym-recommendation-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.locator('.data-source-label')).toHaveCount(4);
    for (const label of await cards.locator('.data-source-label').allTextContents()) {
      expect(label).toMatch(/\d+–\d+ range/);
      expect(label).toMatch(/(low|medium|high) confidence/i);
    }

    await page.goto('/nyu/facilities/nyu_paulson');
    await expect(page.getByText(/Counts under 3 are suppressed/)).toBeVisible();
    await expect(page.getByText(/CampusFit check-ins do not equal official occupancy/)).toBeVisible();
    await page.getByRole('button', { name: 'Later', exact: true }).click();
    await expect(page.locator('.timeline-list > div')).toHaveCount(6);
    await expect(page.getByRole('img', { name: /Demand forecast. Best time/ })).toBeVisible();
    await expect(page.getByText(/ranges remain predictions, not official occupancy/)).toBeVisible();
  });
});
