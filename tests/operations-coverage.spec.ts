import { expect, signInStaff, test } from './fixtures';

const statusCounts = async (page: import('@playwright/test').Page) => {
  const text = await page.locator('.demo-status').innerText();
  const match = text.match(/(\d+) active check-ins · (\d+) future plans/);
  expect(match).not.toBeNull();
  return { active: Number(match![1]), planned: Number(match![2]) };
};

test.describe('staff, administration, and deterministic demo operations', () => {
  test('facility overview stays compact until staff expands one facility', async ({ page }) => {
    await signInStaff(page);
    const overview = page.getByRole('list', { name: 'Campus operations status' });
    await expect(overview.locator('.management-data-row.is-collapsed')).toHaveCount(4);
    await expect(overview.locator('.management-data-row__details:visible')).toHaveCount(0);

    const managePaulson = overview.getByRole('button', { name: 'Manage Paulson' });
    await expect(managePaulson).toHaveAttribute('aria-expanded', 'false');
    await managePaulson.click();
    await expect(managePaulson).toHaveAttribute('aria-expanded', 'true');
    await expect(overview.locator('.management-data-row__details:visible')).toHaveCount(1);
    const workspace = page.getByLabel('Managing Paulson');
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole('tab')).toHaveCount(4);
    await expect(workspace.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await workspace.getByRole('tab', { name: 'Equipment' }).click();
    await expect(workspace.getByRole('heading', { name: 'Equipment availability' })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: 'Hours and closures' })).toHaveCount(0);
    await workspace.getByRole('tab', { name: 'Hours' }).click();
    await expect(workspace.getByLabel('Today’s closing time')).toBeVisible();
    await workspace.getByRole('tab', { name: 'Forecast' }).click();
    await expect(workspace.getByRole('heading', { name: 'Paulson right now' })).toBeVisible();

    await managePaulson.click();
    await expect(managePaulson).toHaveAttribute('aria-expanded', 'false');
    await expect(overview.locator('.management-data-row__details:visible')).toHaveCount(0);
  });

  test('staff can select facilities, publish hours, and isolate closures by facility', async ({ page }) => {
    await signInStaff(page);
    await page.getByRole('button', { name: 'Manage Paulson' }).click();
    await page.getByRole('tab', { name: 'Hours' }).click();
    await page.getByLabel('Today’s closing time').fill('21:15');
    await page.getByRole('button', { name: 'Save hours' }).click();
    await expect(page.getByRole('status')).toContainText('Operating hours saved');

    await page.getByRole('button', { name: /Close Paulson for 2 hours/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close Paulson' }).click();
    await expect(page.getByText('Temporarily closed', { exact: true })).toBeVisible();
    await expect(page.locator('.management-metric-grid')).toContainText('1');

    await page.getByRole('button', { name: 'Manage 404 Fitness' }).click();
    await page.getByRole('tab', { name: 'Hours' }).click();
    await expect(page.getByText('Open and operating', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Close 404 Fitness for 2 hours/ })).toBeVisible();
    await page.getByRole('button', { name: 'Manage Paulson' }).click();
    await page.getByRole('tab', { name: 'Hours' }).click();
    await page.getByRole('button', { name: /Reopen Paulson now/ }).click();
    await expect(page.getByText('Open and operating', { exact: true })).toBeVisible();
  });

  test('staff equipment controls enforce lower, upper, and zero-supply outcomes', async ({ page }) => {
    await signInStaff(page);
    await page.getByRole('button', { name: 'Manage Palladium' }).click();
    await page.getByRole('tab', { name: 'Equipment' }).click();
    const panel = page.locator('.equipment-control-panel');
    await page.getByRole('button', { name: /Record repair/ }).click();
    const quantity = page.getByLabel('Units repaired');
    await expect(quantity).toHaveValue('1');
    await expect(page.getByRole('button', { name: 'Decrease restored units' })).toBeDisabled();

    await quantity.fill('0');
    await expect(quantity).toHaveValue('1');
    await quantity.fill('999');
    await expect(quantity).toHaveValue('2');
    await page.getByRole('button', { name: 'Increase restored units' }).click({ force: true });
    await expect(quantity).toHaveValue('2');

    await page.getByRole('button', { name: /Restore 2 units/ }).click();
    await expect(panel).toContainText('Fully operational');
    await expect(page.getByText(/no repairs to record/i)).toBeVisible();

    await page.getByRole('button', { name: /Report issue/ }).click();
    const issueQuantity = page.getByLabel('Units out of service');
    await issueQuantity.fill('0');
    await expect(issueQuantity).toHaveValue('1');
    await issueQuantity.fill('999');
    await expect(issueQuantity).toHaveValue('8');
    await page.getByRole('button', { name: /Mark 8 units out of service/ }).click();
    await expect(panel).toContainText('0 / 8');
    await expect(page.getByRole('button', { name: /Report issue/ })).toBeDisabled();
    await page.getByRole('button', { name: /Record repair/ }).click();
    await expect(quantity).toHaveAttribute('max', '8');
  });

  test('administrator saves tenant settings and surfaces non-production integration states', async ({ page }) => {
    await signInStaff(page, 'Taylor Morgan');
    const branding = page.locator('#branding');
    await branding.locator('.color-input input').nth(1).fill('#123456');
    await page.getByLabel('Minimum aggregate count').fill('5');
    await page.getByLabel('Auto-close grace period').fill('45');
    await page.getByLabel('Configured mode').selectOption('oidc');
    await expect(page.getByText(/Switching this selector does not claim or create a live integration/)).toBeVisible();
    await page.getByRole('button', { name: 'Save university settings' }).click();
    await expect(page.getByRole('status')).toContainText('University settings saved');
    await expect(page.locator('.app-shell')).toHaveAttribute('style', /--tenant-primary: #123456/);
    await expect(page.getByLabel('Minimum aggregate count')).toHaveValue('5');
    await expect(page.getByLabel('Auto-close grace period')).toHaveValue('45');
  });

  test('administrator catalogue notifications can be explicitly dismissed', async ({ page }) => {
    await signInStaff(page, 'Taylor Morgan');
    await page.getByRole('button', { name: /Review catalogue/ }).click();
    const toast = page.getByRole('status');
    await expect(toast).toContainText('Catalogue review is available through Facilities and Staff tools');
    await toast.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(toast).toHaveCount(0);
  });

  test('every demo control produces a deterministic outcome and reset restores counts', async ({ page }) => {
    await signInStaff(page, 'Taylor Morgan');
    await page.getByRole('navigation', { name: /Staff( mobile)? navigation/ }).getByRole('link', { name: 'Demo controls' }).click();
    const initial = await statusCounts(page);

    await page.getByRole('button', { name: 'Add plan' }).click();
    await expect.poll(() => statusCounts(page)).toEqual({ active: initial.active, planned: initial.planned + 1 });
    await page.getByRole('button', { name: 'Check user in' }).click();
    await expect.poll(() => statusCounts(page)).toEqual({ active: initial.active + 1, planned: initial.planned + 1 });

    for (const [button, message] of [
      ['Delay 20 min', 'Plan delayed'],
      ['Add squash', 'Squash activity updated'],
      ['Add badminton', 'Badminton activity demand increased'],
      ['Add climbing', 'Climbing demand increased'],
      ['Trigger outage', 'Cable outage active'],
      ['Move user', 'Synthetic visit moved'],
      ['Check user out', 'Synthetic user checked out']
    ] as const) {
      await page.getByRole('button', { name: button }).click();
      await expect(page.getByRole('status')).toContainText(message);
    }

    const changed = await statusCounts(page);
    expect(changed.active).toBe(initial.active + 3);
    expect(changed.planned).toBe(initial.planned + 1);
    await page.getByRole('button', { name: /Reset NYU demo/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reset NYU demo' }).click();
    await expect.poll(() => statusCounts(page)).toEqual(initial);
    await expect(page.getByRole('status')).toContainText('NYU demo data reset');
  });

  test('staff mutations affect student forecasts without exposing operations controls', async ({ page }) => {
    await signInStaff(page);
    await page.getByRole('button', { name: 'Manage Palladium' }).click();
    await page.getByRole('tab', { name: 'Equipment' }).click();
    await page.getByRole('button', { name: /Report issue/ }).click();
    await page.getByRole('button', { name: /Mark 1 unit out of service/ }).click();
    await page.getByRole('tab', { name: 'Hours' }).click();
    await page.getByRole('button', { name: /Close Palladium for 2 hours/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close Palladium' }).click();
    await page.locator('.admin-console-session').getByRole('button', { name: /Sign out/ }).click();
    await page.getByRole('link', { name: /Student access/ }).click();
    await page.getByRole('button', { name: /Maya Chen/ }).click();

    await page.getByRole('link', { name: 'Explore' }).first().click();
    await expect(page.locator('.workout-equipment-status')).toContainText('3 of 8 out of service');
    await expect(page.getByRole('button', { name: /Report issue|Restore \d+ units?/ })).toHaveCount(0);
    await page.getByRole('link', { name: 'Gyms' }).first().click();
    const palladium = page.locator('.gym-recommendation-card').filter({ hasText: 'Palladium' });
    await expect(palladium).toContainText('Unavailable');
  });

  test('synthetic demo activity remains aggregate-only after switching to a student', async ({ page }) => {
    await signInStaff(page, 'Taylor Morgan');
    await page.getByRole('navigation', { name: /Staff( mobile)? navigation/ }).getByRole('link', { name: 'Demo controls' }).click();
    await page.getByRole('button', { name: 'Add squash' }).click();
    await expect(page.getByRole('status')).toContainText('Squash activity updated');
    await page.locator('.admin-console-session').getByRole('button', { name: /Sign out/ }).click();
    await page.getByRole('link', { name: /Student access/ }).click();
    await page.getByRole('button', { name: /Maya Chen/ }).click();

    await page.goto('/nyu/facilities/nyu_palladium');
    await expect(page.locator('body')).not.toContainText('Synthetic demo student');
    await expect(page.locator('.active-visit-card')).toHaveCount(0);
    await expect(page.getByText(/voluntary participation/i).first()).toBeVisible();
    await expect(page.getByText(/Counts under 3 are suppressed/)).toBeVisible();
  });
});
