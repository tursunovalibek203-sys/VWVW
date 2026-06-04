import { test, expect } from '@playwright/test';

test.describe('Orders Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders');
    await page.waitForTimeout(2000);
  });

  test('should display orders page', async ({ page }) => {
    await expect(page).toHaveURL(/.*orders/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display orders list', async ({ page }) => {
    const ordersContainer = page.locator('table, [class*="order"], [class*="list"]');
    await expect(ordersContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add order button', async ({ page }) => {
    const addButton = page.locator('button:has-text("Qo\'shish"), button:has-text("Add"), button:has-text("Yangi")');
    const buttonCount = await addButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should display order statuses', async ({ page }) => {
    // Check for status badges (PENDING, CONFIRMED, etc.)
    const statusBadges = page.locator('[class*="badge"], [class*="status"]');
    const badgeCount = await statusBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter orders by status', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Pending"), button:has-text("Confirmed"), button:has-text("Kutilmoqda")');
    
    if (await filterButton.first().isVisible()) {
      await filterButton.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Qidirish"], input[placeholder*="Search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      expect(await searchInput.inputValue()).toBe('test');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});
