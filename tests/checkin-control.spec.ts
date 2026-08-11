import type { Page } from '@playwright/test';
import { expect, signInStudent, test } from './fixtures';

const idleCheckIn = (page: Page) => page.getByRole('button', { name: 'Check in', exact: true });
const lockedCheckIn = (page: Page) => page.getByRole('button', { name: 'Checked in — check-in locked until checkout' });

async function completeQuickCheckIn(page: Page, duration: '45 min' | '60 min' | '75 min' = '45 min') {
  await idleCheckIn(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: duration, exact: true }).click();
  await dialog.getByRole('button', { name: /Review/ }).click();
  await dialog.getByRole('button', { name: 'Check in', exact: true }).click();
  await dialog.getByRole('button', { name: /View active visit/ }).click();
}

async function advanceUntilToast(page: Page, message: string) {
  for (let elapsed = 0; elapsed < 20_000; elapsed += 500) {
    await page.clock.runFor(500);
    const toast = page.getByRole('status');
    if (await toast.count() && (await toast.textContent())?.includes(message)) return toast;
  }
  throw new Error(`Notification did not appear: ${message}`);
}

test.describe('home check-in control', () => {
  test('uses a text-only green pill with accessible sizing and no horizontal overflow', async ({ page }) => {
    await signInStudent(page);
    const control = idleCheckIn(page);
    await expect(control).toBeVisible();
    await expect(control).toBeEnabled();
    await expect(control).toHaveText('Check in');
    await expect(control.locator('svg')).toHaveCount(0);

    const styles = await control.evaluate((element) => {
      const computed = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        height: bounds.height,
        right: bounds.right
      };
    });
    expect(styles.backgroundColor).toBe('rgb(47, 103, 80)');
    expect(styles.color).toBe('rgb(255, 255, 255)');
    expect(styles.height).toBeGreaterThanOrEqual(44);
    expect(styles.right).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

    await control.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(control).toBeFocused();
  });

  test('turns red and remains locked until the active visit is checked out', async ({ page }) => {
    await signInStudent(page);
    await completeQuickCheckIn(page);

    const locked = lockedCheckIn(page);
    await expect(locked).toBeVisible();
    await expect(locked).toBeDisabled();
    await expect(locked).toHaveText('Checked in · locked');
    await expect(locked).toHaveClass(/is-locked/);
    await expect(locked.locator('svg')).toHaveCount(0);
    await expect.poll(() => locked.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(146, 63, 56)');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /View active visit/ })).toBeVisible();

    await page.locator('.active-visit-card').getByRole('button', { name: /Wrap up workout/ }).click();
    await expect(locked).toHaveCount(0);
    await expect(idleCheckIn(page)).toBeEnabled();
    await expect.poll(() => idleCheckIn(page).evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(47, 103, 80)');
  });

  test('places the active workout first with a balanced responsive action row', async ({ page }) => {
    await signInStudent(page);
    await completeQuickCheckIn(page);

    const layout = await page.locator('.active-visit-card').evaluate((card) => {
      const overview = document.querySelector('.student-overview')!;
      const top = card.querySelector('.active-visit-card__top')!;
      const identity = card.querySelector('.active-visit-card__identity')!;
      const action = card.querySelector('.active-actions .button')!;
      const main = card.querySelector('.active-visit-main')!;
      const bounds = (element: Element) => element.getBoundingClientRect();
      return {
        cardTop: bounds(card).top,
        overviewTop: bounds(overview).top,
        topWidth: bounds(top).width,
        actionWidth: bounds(action).width,
        identityCenter: bounds(identity).top + bounds(identity).height / 2,
        actionCenter: bounds(action).top + bounds(action).height / 2,
        actionBottom: bounds(action).bottom,
        mainTop: bounds(main).top,
        viewportWidth: innerWidth
      };
    });

    expect(layout.cardTop).toBeLessThan(layout.overviewTop);
    expect(layout.actionBottom).toBeLessThanOrEqual(layout.mainTop);
    if (layout.viewportWidth <= 560) {
      expect(Math.abs(layout.actionWidth - layout.topWidth)).toBeLessThanOrEqual(1);
    } else {
      expect(Math.abs(layout.identityCenter - layout.actionCenter)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test('keeps the forgotten-checkout warning and auto-closes after the 30-minute grace period', async ({ page }) => {
    const start = new Date('2026-08-11T17:00:00-04:00');
    await page.clock.install({ time: start });
    await signInStudent(page);
    await completeQuickCheckIn(page, '45 min');
    await page.getByRole('button', { name: 'Dismiss notification' }).click();

    await page.clock.setSystemTime(new Date(start.getTime() + 46 * 60_000));
    const reminder = await advanceUntilToast(page, 'Are you done with your workout?');
    await expect(reminder).toContainText('auto-check you out in 30 minutes');
    await expect(page.getByRole('heading', { name: 'Are you finished?' })).toBeVisible();
    await expect(lockedCheckIn(page)).toBeDisabled();

    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    await page.clock.setSystemTime(new Date(start.getTime() + 76 * 60_000));
    const autoClosed = await advanceUntilToast(page, 'automatically checked you out');
    await expect(autoClosed).toContainText('after the 30-minute grace period');
    await expect(page.locator('.active-visit-card')).toHaveCount(0);
    await expect(lockedCheckIn(page)).toHaveCount(0);
    await expect(idleCheckIn(page)).toBeEnabled();
  });
});
