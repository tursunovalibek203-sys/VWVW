import { test, expect, Page } from '@playwright/test';

test.describe('Login Page Tests', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto('/');
  });

  test('should display login form with correct branding', async ({ page }: { page: Page }) => {
    await expect(page.locator('h1')).toContainText('LUX PET PLAST');
    await expect(page.locator('input[name="login"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }: { page: Page }) => {
    await page.fill('input[name="login"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message to appear (Login.tsx uses bg-rose-50 container)
    await expect(page.locator('.bg-rose-50')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully as admin and redirect to dashboard', async ({ page }: { page: Page }) => {
    await page.fill('input[name="login"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|cashier)/, { timeout: 8000 });
    expect(page.url()).toMatch(/\/(dashboard|cashier)/);
  });

  test('should not submit with empty login', async ({ page }: { page: Page }) => {
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should stay on login page
    await page.waitForTimeout(500);
    expect(page.url()).not.toMatch(/dashboard/);
  });

  test('should not submit with empty password', async ({ page }: { page: Page }) => {
    await page.fill('input[name="login"]', 'admin');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    expect(page.url()).not.toMatch(/dashboard/);
  });

  test('should toggle password visibility', async ({ page }: { page: Page }) => {
    await page.fill('input[name="password"]', 'mypassword');

    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye toggle button
    const toggleBtn = page.locator('button[aria-label*="ko\'rsatish"], button[aria-label*="Parolni"]').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });
});
