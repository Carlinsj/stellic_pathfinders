import { expect, signInStaff, signInStudent, test } from './fixtures';

test.describe('authentication, sessions, and route guards', () => {
  test('anonymous visitors are redirected from every student route', async ({ page }) => {
    for (const path of [
      '/nyu',
      '/nyu/home',
      '/nyu/facilities',
      '/nyu/facilities/nyu_palladium',
      '/nyu/plan',
      '/nyu/activity',
      '/nyu/history'
    ]) {
      await page.goto(path);
      await expect(page, `${path} should require a student session`).toHaveURL(/\/nyu\/login$/);
    }
  });

  test('anonymous visitors are redirected from every operations route', async ({ page }) => {
    for (const path of ['/nyu/staff', '/nyu/admin', '/nyu/demo']) {
      await page.goto(path);
      await expect(page, `${path} should require an operations session`).toHaveURL(/\/nyu\/staff-login$/);
    }
  });

  test('student and staff login portals expose only their eligible accounts', async ({ page }) => {
    await page.goto('/nyu/login');
    await expect(page.getByRole('heading', { name: 'Choose a student account' })).toBeVisible();
    await expect(page.locator('.account-card')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Maya Chen/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Theo Rivera/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Aisha Brooks/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sam Ortiz/ })).toHaveCount(0);

    await page.getByRole('link', { name: /Recreation staff access/ }).click();
    await expect(page).toHaveURL(/\/nyu\/staff-login$/);
    await expect(page.getByRole('heading', { name: 'Authorized staff accounts' })).toBeVisible();
    await expect(page.locator('.account-card')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Sam Ortiz/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Priya Shah/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Taylor Morgan/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Maya Chen/ })).toHaveCount(0);

    await page.getByRole('link', { name: /Student access/ }).click();
    await expect(page).toHaveURL(/\/nyu\/login$/);
  });

  test('student session survives reload and sign-out clears it', async ({ page }) => {
    await signInStudent(page, 'Theo Rivera');
    await expect(page.getByRole('heading', { name: /Theo/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('campusfit.demo.session.nyu'))).toBe('nyu_theo');

    await page.reload();
    await expect(page.getByRole('heading', { name: /Theo/ })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out Theo Rivera' }).click();
    await expect(page).toHaveURL(/\/nyu\/login$/);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('campusfit.demo.session.nyu'))).toBeNull();

    await page.goto('/nyu/history');
    await expect(page).toHaveURL(/\/nyu\/login$/);
  });

  test('recreation staff are restricted to facility operations', async ({ page }) => {
    await signInStaff(page);
    await expect(page.locator('.desktop-sidebar nav a[href="/nyu/staff"]')).toHaveCount(1);
    await expect(page.locator('.bottom-nav')).toHaveCount(0);
    await expect(page.locator('a[href="/nyu/admin"], a[href="/nyu/demo"]')).toHaveCount(0);

    for (const path of ['/nyu/admin', '/nyu/demo', '/nyu/home']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/nyu\/staff$/);
      await expect(page.getByRole('heading', { name: /Campus operations at a glance/ })).toBeVisible();
    }

    await page.locator('.admin-console-session').getByRole('button', { name: /Sign out/ }).click();
    await expect(page).toHaveURL(/\/nyu\/staff-login$/);
  });

  test('university administrators can use all operations areas but no student area', async ({ page }) => {
    await signInStaff(page, 'Taylor Morgan');
    const navigation = page.getByRole('navigation', { name: /Staff( mobile)? navigation/ });
    await expect(navigation.getByRole('link', { name: 'Facility operations' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'University settings' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Demo controls' })).toBeVisible();

    await navigation.getByRole('link', { name: 'Facility operations' }).click();
    await expect(page).toHaveURL(/\/nyu\/staff$/);
    await navigation.getByRole('link', { name: 'Demo controls' }).click();
    await expect(page).toHaveURL(/\/nyu\/demo$/);
    await expect(page.getByRole('heading', { name: /Tell the CampusFit story live/ })).toBeVisible();

    await page.goto('/nyu/history');
    await expect(page).toHaveURL(/\/nyu\/admin$/);
  });

  test('invalid facility IDs fall back to the authenticated facility list', async ({ page }) => {
    await signInStudent(page);
    await page.goto('/nyu/facilities/not-a-real-facility');
    await expect(page).toHaveURL(/\/nyu\/facilities$/);
    await expect(page.getByRole('heading', { name: /Every gym, one clear view/ })).toBeVisible();
  });

  test('unknown public routes render a recoverable 404', async ({ page }) => {
    await page.goto('/definitely-not-a-route');
    await expect(page.getByRole('heading', { name: /That route missed the gym/ })).toBeVisible();
    await page.getByRole('link', { name: 'Return home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Know where and when/ })).toBeVisible();
  });
});
