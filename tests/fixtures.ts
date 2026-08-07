import { expect, test as base, type Page } from '@playwright/test';

type AutomaticFixtures = {
  browserErrorGuard: void;
};

export const test = base.extend<AutomaticFixtures>({
  browserErrorGuard: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    await use();

    expect(errors, 'The browser emitted unexpected console or page errors').toEqual([]);
  }, { auto: true }]
});

export { expect };

export async function signInStudent(page: Page, name = 'Maya Chen') {
  await page.goto('/nyu/login');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/nyu\/home$/);
}

export async function signInStaff(page: Page, name = 'Sam Ortiz') {
  await page.goto('/nyu/staff-login');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(name === 'Taylor Morgan' ? /\/nyu\/admin$/ : /\/nyu\/staff$/);
}

