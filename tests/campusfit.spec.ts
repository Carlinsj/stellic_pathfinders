import { expect, test, type Locator, type Page } from '@playwright/test';

async function pointerTap(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

test('public landing explains sources and privacy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Know where and when/i })).toBeVisible();
  await expect(page.getByText(/All demonstration data is synthetic/i)).toBeVisible();
  await page.locator('#privacy').scrollIntoViewIfNeeded();
  await expect(page.getByText(/Anonymous by design/i)).toBeVisible();
});

test('complete NYU planned visit with delay, check-in, and check-out', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Maya/ })).toBeVisible();
  const recommendationHero = page.locator('.recommendation-hero');
  await expect(recommendationHero).toContainText(/CampusFit users checked in/);
  await recommendationHero.locator('.hero-actions .button--primary').click();
  await expect(page.getByRole('heading', { name: /What are you doing/i })).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  const arrivalTime = await page.evaluate(() => {
    const date = new Date(Date.now() + 60 * 60_000);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });
  await page.getByLabel('Arrival time').fill(arrivalTime);
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.locator('.compare-option:not(:disabled)').first().click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Save visit plan/ }).click();
  const upcoming = page.locator('.upcoming-strip');
  await expect(upcoming).toBeVisible();
  await upcoming.getByRole('button', { name: /Running late/ }).click();
  const delayButton = page.getByRole('button', { name: /20 minutes late/ });
  await pointerTap(page, delayButton);
  await expect(upcoming).toContainText('Updated arrival');
  await upcoming.getByRole('button', { name: /I’m here/ }).press('Enter');
  const active = page.locator('.active-visit-card');
  await expect(active).toContainText('You’re at');
  await expect(page.getByLabel('New finish time')).toBeVisible();
  await expect(active.getByRole('button', { name: /Extend 20 min/ })).not.toBeVisible();
  const laterFinish = await page.evaluate(() => {
    const date = new Date(Date.now() + 90 * 60_000);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  await page.getByLabel('New finish time').fill(laterFinish);
  await page.getByRole('button', { name: /Extend until this time/ }).click();
  await expect(page.getByRole('status')).toContainText(/Visit extended until/);
  await active.getByRole('button', { name: /Wrap up workout/ }).press('Enter');
  await expect(active).toHaveCount(0);
});

test('spontaneous activity-only visit works without location permission', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.getByRole('button', { name: 'I’m here', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Manual facility selection');
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: 'Activity only' }).click();
  await dialog.getByLabel('Activity').selectOption('badminton');
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: /Review/ }).click();
  await dialog.getByRole('button', { name: /Check in anonymously/ }).press('Enter');
  await expect(dialog).toContainText(/You’re checked in at Paulson/i);
  await dialog.getByRole('button', { name: /View active visit/ }).click();
  const activeVisit = page.locator('.active-visit-card');
  await expect(activeVisit).toContainText('Active activity visit');
  await expect(activeVisit).toContainText('Badminton');
  await expect(activeVisit.getByLabel('Active workout focus')).toHaveCount(0);
});

test('activity-only planning ranks compatible facilities without a workout focus', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.getByRole('link', { name: 'Plan' }).first().click();
  await page.getByRole('button', { name: 'Activity only' }).click();
  await page.getByLabel('Choose your activity').selectOption('badminton');
  await expect(page.getByText(/No workout focus or strength-equipment demand will be added/i)).toBeVisible();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText(/Ranked for badminton/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /404 Fitness/ })).toBeDisabled();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.locator('.plan-review-hero')).toContainText('Activity only');
  await expect(page.locator('.equipment-review')).toContainText('Badminton courts');
  await page.getByRole('button', { name: /Save visit plan/ }).click();
  await expect(page.locator('.upcoming-strip')).toContainText('Badminton');
});

test('students can plan a workout with multiple muscle groups', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.getByRole('link', { name: 'Plan' }).first().click();
  const focusPicker = page.getByRole('group', { name: 'Muscle groups' });
  await expect(focusPicker.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await focusPicker.getByRole('button', { name: 'Chest', exact: true }).click();
  await focusPicker.getByRole('button', { name: 'Legs', exact: true }).click();
  await focusPicker.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(focusPicker.getByRole('button', { name: 'Chest', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(focusPicker.getByRole('button', { name: 'Legs', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.locator('.plan-review-hero')).toContainText('Chest + Legs');
  await page.getByRole('button', { name: /Save visit plan/ }).click();
  await expect(page.locator('.upcoming-strip')).toContainText('Chest + Legs');
});

test('planning shows gym demand, ranking reasons, and mandatory anonymous contribution', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.getByRole('link', { name: 'Plan' }).first().click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText('Better after 7:30')).toHaveCount(0);
  await page.getByLabel('Arrival time').fill('18:00');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Brooklyn/ }).click();
  await expect(page.getByRole('heading', { name: /Demand for Back at Brooklyn/ })).toBeVisible();
  await expect(page.locator('.ranking-explanation')).toContainText('less busy overall');
  await expect(page.locator('.ranking-explanation')).toContainText('Workout-specific wait');
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByLabel('Anonymous demand contribution')).toContainText('never shown to other students');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByText('Friends only')).not.toBeVisible();
});

test('quick check-in accepts multiple muscle groups', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.getByRole('button', { name: 'I’m here', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Continue/ }).click();
  const focusPicker = dialog.getByRole('group', { name: 'Muscle groups' });
  await focusPicker.getByRole('button', { name: 'Chest', exact: true }).click();
  await focusPicker.getByRole('button', { name: 'Legs', exact: true }).click();
  await focusPicker.getByRole('button', { name: 'General workout', exact: true }).click();
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await dialog.getByRole('button', { name: /Review/ }).click();
  await expect(dialog.getByLabel('Anonymous demand contribution')).toContainText('workout areas may be in demand');
  await expect(dialog.getByText('Private', { exact: true })).not.toBeVisible();
  await expect(dialog).toContainText('Chest + Legs');
});

test('NYU home surfaces all four verified facilities', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await expect(page.locator('.facility-grid--home .facility-card')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Brooklyn' })).toBeVisible();
});

test('NYU facility activity tabs match the verified recreation catalog', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();

  await page.goto('/nyu/facilities/nyu_palladium');
  await page.getByRole('button', { name: 'Activities' }).click();
  await expect(page.getByRole('heading', { name: 'Climbing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Volleyball' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Squash' })).toHaveCount(0);

  await page.goto('/nyu/facilities/nyu_paulson');
  await page.getByRole('button', { name: 'Activities' }).click();
  await expect(page.getByRole('heading', { name: 'Pickleball' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Squash' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Climbing' })).toHaveCount(0);

  await page.goto('/nyu/facilities/nyu_404');
  await page.getByRole('button', { name: 'Activities' }).click();
  await expect(page.getByRole('heading', { name: 'Functional Training' })).toBeVisible();

  await page.goto('/nyu/facilities/nyu_brooklyn');
  await page.getByRole('button', { name: 'Activities' }).click();
  await expect(page.getByRole('heading', { name: 'Table Tennis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Futsal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cricket' })).toBeVisible();
});

test('students see workout-specific equipment outages without staff controls', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.getByRole('link', { name: 'Demand', exact: true }).first().click();

  const status = page.locator('.workout-equipment-status');
  await expect(status.getByRole('heading', { name: 'Equipment status for Back' })).toBeVisible();
  await expect(status).toContainText('Cable stations');
  await expect(status).toContainText('2 of 8 out of service');
  await expect(status).toContainText('Staff reported');
  await expect(page.getByRole('button', { name: /Mark 1 out of service|Restore \d+ units?/ })).toHaveCount(0);

  await page.getByLabel('Workout focus').selectOption('legs');
  await expect(status.getByRole('heading', { name: 'Equipment status for Legs' })).toBeVisible();
  await expect(status).toContainText('Everything you need is ready');
  await expect(status).not.toContainText('Cable stations');
});

test('facility equipment tab combines outage status with demand ranges', async ({ page }) => {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.goto('/nyu/facilities/nyu_palladium');
  await page.getByRole('button', { name: 'Equipment' }).click();

  await expect(page.getByRole('heading', { name: 'Equipment status for Back' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Equipment demand' })).toContainText('Cable stations');
  await expect(page.getByText('Expected waits for your workout')).toBeVisible();
});

test('student and staff portals enforce separate role access', async ({ page }) => {
  await page.goto('/nyu/login');
  await expect(page.getByRole('button', { name: /Maya Chen/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sam Ortiz/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await expect(page.getByRole('link', { name: /Facility operations/ })).toHaveCount(0);

  await page.goto('/nyu/staff');
  await expect(page).toHaveURL(/\/nyu\/home$/);
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Maya/ })).toBeVisible();

  await page.goto('/nyu/staff-login');
  await expect(page.getByRole('button', { name: /Sam Ortiz/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Maya Chen/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Sam Ortiz/ }).click();
  await expect(page.getByRole('heading', { name: /Keep campus demand trustworthy/ })).toBeVisible();
  await expect(page.locator('.admin-console-header')).toContainText('NYU Athletics operations');
  await expect(page.locator('.admin-console-header')).toContainText('Facility operations');
  await expect(page.locator('.desktop-sidebar nav a[href="/nyu/home"], .bottom-nav a[href="/nyu/home"]')).toHaveCount(0);

  await page.goto('/nyu/home');
  await expect(page).toHaveURL(/\/nyu\/staff$/);
});

test('university administrators land in the protected configuration console', async ({ page }) => {
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Taylor Morgan/ }).click();

  await expect(page).toHaveURL(/\/nyu\/admin$/);
  await expect(page.locator('.app-shell')).toHaveClass(/app-shell--staff/);
  await expect(page.locator('.admin-console-header')).toContainText('University settings');
  await expect(page.getByRole('heading', { name: /Configure CampusFit for NYU/ })).toBeVisible();
  await expect(page.locator('.desktop-sidebar nav a[href="/nyu/home"], .bottom-nav a[href="/nyu/home"]')).toHaveCount(0);
});

test('staff can restore a bounded number of equipment units and reopen a facility', async ({ page }) => {
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Sam Ortiz/ }).click();
  const inventory = page.locator('.equipment-control-panel');
  const restoreQuantity = page.getByLabel('Units repaired');
  await expect(inventory).toContainText('2 out of service');
  await expect(restoreQuantity).toHaveAttribute('max', '2');

  await page.getByRole('button', { name: /Mark 1 out of service/ }).click();
  await page.getByRole('button', { name: /Mark 1 out of service/ }).click();
  await expect(inventory).toContainText('4 out of service');
  await expect(page.getByRole('button', { name: '3', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All 4', exact: true })).toBeVisible();
  await restoreQuantity.fill('99');
  await expect(restoreQuantity).toHaveValue('4');

  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page.locator('.repair-outcome')).toContainText('after repair');
  await expect(page.locator('.repair-outcome')).toContainText('7 / 8');
  await page.getByRole('button', { name: /Restore 3 units/ }).click();
  await expect(inventory).toContainText('7 / 8');
  await expect(inventory).toContainText('1 out of service');
  await expect(restoreQuantity).toHaveAttribute('max', '1');

  await page.getByRole('button', { name: /Restore 1 unit/ }).click();
  await expect(inventory).toContainText('8 / 8');
  await expect(inventory).toContainText('Fully operational');
  await expect(page.getByText(/no repairs to record/i)).toBeVisible();

  await page.getByRole('button', { name: /Close Palladium for 2 hours/ }).click();
  await expect(page.getByText('Temporarily closed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Reopen Palladium now/ }).click();
  await expect(page.getByText('Open and operating', { exact: true })).toBeVisible();
});

test('staff equipment workspace fits its viewport with touch-friendly controls', async ({ page }, testInfo) => {
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Sam Ortiz/ }).click();
  const workspace = page.locator('.equipment-admin-card');
  await expect(workspace).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Record completed repair' })).toBeVisible();

  const viewport = page.viewportSize()!;
  const bounds = await workspace.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  const decreaseButton = page.getByRole('button', { name: 'Decrease restored units' });
  const controlBounds = await decreaseButton.boundingBox();
  expect(controlBounds).not.toBeNull();
  expect(controlBounds!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: `test-results/campusfit-staff-equipment-${testInfo.project.name}.png`, fullPage: true });
});

test('mobile navigation and privacy states are accessible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only assertion');
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(navigation).toBeVisible();
  await pointerTap(page, navigation.getByRole('link', { name: 'Activity' }));
  await expect(page.getByText(/Your visits, nobody else’s/)).toBeVisible();
  await expect(page.getByText(/Private to Maya Chen/)).toBeVisible();
});

test('the product is NYU-only with no university switcher or UIUC route', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(/UIUC|University of Illinois/i);
  await expect(page.locator('a[href*="uiuc"], button:has-text("Switch university")')).toHaveCount(0);
  await page.goto('/uiuc');
  await expect(page.getByRole('heading', { name: /That route missed the gym/i })).toBeVisible();
});
