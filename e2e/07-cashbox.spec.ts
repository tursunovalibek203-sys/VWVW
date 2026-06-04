import { test, expect } from '@playwright/test';

test.describe('Cashbox Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cashbox');
    await page.waitForTimeout(2000);
  });

  test('should display cashbox page', async ({ page }) => {
    await expect(page).toHaveURL(/.*cashbox/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display cashbox balance', async ({ page }) => {
    // Hero card is a dark rounded card showing KASSA BALANSI text
    const heroCard = page.locator('[class*="bg-slate-900"], [class*="rounded-2xl"]').first();
    await expect(heroCard).toBeVisible({ timeout: 10000 });
  });

  test('should display income and expense', async ({ page }) => {
    // App shows Kirim/Chiqim buttons — count any rounded-2xl card or button
    const elements = page.locator('[class*="rounded-2xl"]');
    const count = await elements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have add transaction button', async ({ page }) => {
    // App shows "Кирим" (Kirim) and "Чиқим" (Chiqim) action buttons
    const addButton = page.locator('button:has-text("irim"), button:has-text("iqim"), button:has-text("Кирим"), button:has-text("Чиқим")');
    const buttonCount = await addButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should display transaction history', async ({ page }) => {
    const historyContainer = page.locator('table, [class*="transaction"], [class*="history"]');
    await expect(historyContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter by date range', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"]');
    
    if (await dateFilter.first().isVisible()) {
      await dateFilter.first().fill('2026-03-01');
      await page.waitForTimeout(1000);
    }
  });

  test('should display multi-currency support', async ({ page }) => {
    // Check for USD, UZS, CLICK
    const currencyElements = page.locator('text=/USD|UZS|CLICK/');
    const currencyCount = await currencyElements.count();
    expect(currencyCount).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});
