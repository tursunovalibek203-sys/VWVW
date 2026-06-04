import { Page } from '@playwright/test';

export async function login(
  page: Page,
  username: string = 'admin',
  password: string = 'admin123'
) {
  await page.goto('/');
  // Login page uses text input with name="login", not email
  await page.fill('input[name="login"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard or cashier panel
  await page.waitForURL(/\/(dashboard|cashier)/, { timeout: 8000 });
}

export async function loginAsCashier(page: Page) {
  await login(page, 'cashier', 'cashier123');
}

export async function logout(page: Page) {
  const logoutButton = page.locator('button:has-text("Chiqish"), button:has-text("Logout")');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
}

export async function ensureLoggedIn(page: Page) {
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.match(/localhost:\d+\/?$/)) {
    await login(page);
  }
}
