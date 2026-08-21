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
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Maya/ })).toBeVisible();
  await expect(page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/campusfit-home.png', fullPage: true });
  expect(await page.locator('body').innerText()).toContain('CampusFit');
  await page.getByRole('link', { name: 'Plan' }).first().click();
  await expect(page.getByRole('group', { name: 'Muscle groups' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-multi-focus-plan.png', fullPage: true });
  await page.goto('/nyu/facilities/nyu_paulson');
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(page.getByText(/Your best bet is around/i)).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-facility-later.png', fullPage: true });
  await page.goto('/nyu/home');
  await page.getByRole('link', { name: 'Explore', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Equipment status for Back' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-equipment-status.png', fullPage: true });
  await page.getByRole('link', { name: 'Plan' }).first().click();
  await page.getByRole('button', { name: 'Activity only' }).click();
  await expect(page.getByLabel('Choose your activity')).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-activity-plan.png', fullPage: true });
  await page.locator('.student-profile-action').click();
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Sam Ortiz/ }).click();
  await page.getByRole('button', { name: 'Manage Palladium' }).click();
  await page.getByRole('tab', { name: 'Equipment' }).click();
  await expect(page.getByRole('button', { name: /Record repair/ })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Maya/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (width < 961) {
      const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
      await expect(mobileNavigation).toBeVisible();
      if (width === 390) {
        const detailAction = page.locator('.facility-grid--home .card-link').first();
        await detailAction.scrollIntoViewIfNeeded();
        const [actionBounds, navigationBounds] = await Promise.all([detailAction.boundingBox(), mobileNavigation.boundingBox()]);
        expect(actionBounds).not.toBeNull();
        expect(navigationBounds).not.toBeNull();
        expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(navigationBounds!.y);
      }
    }
    else await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await page.screenshot({ path: `test-results/campusfit-home-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nyu/plan');
  await expect(page.getByRole('group', { name: 'Muscle groups' })).toBeVisible();
  const planOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(planOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/campusfit-multi-focus-plan-390.png', fullPage: true });
  await page.goto('/nyu/facilities/nyu_paulson');
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  const facilityOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(facilityOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/campusfit-facility-later-390.png', fullPage: true });
  await page.goto('/nyu/home');
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(dialogBounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/campusfit-checkin-sheet-390.png' });
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await expect(dialog.getByRole('group', { name: 'Muscle groups' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campusfit-multi-focus-checkin-390.png' });
});

test('remaining student routes are overflow-free and keep actions reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single cross-viewport audit');
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();

  for (const width of [320, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    for (const route of ['plan', 'activity', 'history']) {
      await page.goto(`/nyu/${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} overflows at ${width}px`).toBeLessThanOrEqual(1);
    }

    await page.goto('/nyu/activity');
    await expect(page.getByRole('link', { name: /Plan this visit/ })).toBeVisible();
    await page.goto('/nyu/history');
    await expect(page.getByRole('link', { name: /Plan a visit/ })).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nyu/plan');
  await page.screenshot({ path: 'test-results/campusfit-plan-phase4-390.png', fullPage: true });
  await page.goto('/nyu/activity');
  await page.screenshot({ path: 'test-results/campusfit-explore-phase4-390.png', fullPage: true });
  await page.goto('/nyu/history');
  await page.screenshot({ path: 'test-results/campusfit-visits-phase4-390.png', fullPage: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/nyu/activity');
  await page.screenshot({ path: 'test-results/campusfit-explore-phase4-1280.png', fullPage: true });
});

test('facility forecast summary stays compact on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single mobile visual check');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: /Maya Chen/ }).click();
  await page.goto('/nyu/facilities/nyu_paulson');

  const prediction = page.getByLabel('Current CampusFit prediction');
  await expect(prediction).toBeVisible();
  await expect(prediction.getByText(/demand$/)).toBeVisible();
  await expect(prediction.getByText(/expected$/)).toHaveCount(0);
  await expect(prediction).toContainText('not official occupancy');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/campusfit-facility-summary-390.png', fullPage: true });
});

test('final management layouts fit narrow screens and expose page context', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'single cross-viewport audit');
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: /Taylor Morgan/ }).click();

  for (const route of ['staff', 'admin', 'demo']) {
    await page.goto(`/nyu/${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    const clipping = await page.locator('main > .page-stack > *').evaluateAll((elements) => elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.max(0, bounds.right - window.innerWidth);
    }));
    expect(Math.max(...clipping), `${route} clips at 320px`).toBeLessThanOrEqual(1);
    await expect(page).toHaveTitle(/CampusFit$/);
  }

  await page.goto('/nyu/admin');
  const signOut = page.getByRole('button', { name: 'Sign out of staff portal' });
  const signOutBounds = await signOut.boundingBox();
  expect(signOutBounds).not.toBeNull();
  expect(signOutBounds!.width).toBeGreaterThanOrEqual(44);
  expect(signOutBounds!.height).toBeGreaterThanOrEqual(44);

  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: width === 320 ? 760 : 900 });
    await page.goto('/nyu/staff');
    const centerDeltas = await page.locator('.management-metric__icon').evaluateAll((wrappers) => wrappers.map((wrapper) => {
      const icon = wrapper.querySelector('svg')!;
      const outer = wrapper.getBoundingClientRect();
      const inner = icon.getBoundingClientRect();
      return {
        x: Math.abs((outer.left + outer.width / 2) - (inner.left + inner.width / 2)),
        y: Math.abs((outer.top + outer.height / 2) - (inner.top + inner.height / 2))
      };
    }));
    expect(centerDeltas).toHaveLength(4);
    expect(Math.max(...centerDeltas.flatMap(({ x, y }) => [x, y])), `management icons are off-center at ${width}px`).toBeLessThanOrEqual(.5);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/nyu/staff');
  await page.getByRole('button', { name: 'Manage Palladium' }).click();
  const workspace = page.getByLabel('Managing Palladium');
  await expect(workspace).toBeVisible();
  await workspace.getByRole('tab', { name: 'Equipment' }).click();
  await expect(workspace.getByRole('heading', { name: 'Equipment availability' })).toBeVisible();
  await expect(workspace.getByRole('button', { name: /Report issue Choose number of units/ })).toBeVisible();
  const workspaceOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(workspaceOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/campusfit-staff-workspace-390.png', fullPage: true });
});
