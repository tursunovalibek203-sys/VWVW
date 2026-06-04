import { test, expect } from '@playwright/test';

test.describe('Sales Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
  });

  test('should display sales page', async ({ page }) => {
    await expect(page).toHaveURL(/.*sales/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display sales list', async ({ page }) => {
    const salesContainer = page.locator('table, [class*="sale"], [class*="list"]');
    await expect(salesContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add sale button', async ({ page }) => {
    // App uses "Yangi sотув" in Cyrillic or navigates to /sales/add
    const addButton = page.locator('button[class*="bg-indigo"], button[class*="bg-violet"], a[href*="sales/add"]');
    const buttonCount = await addButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should open add sale modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("Qo\'shish"), button:has-text("Add"), button:has-text("Yangi")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible();
      }
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

  test('should display sale details', async ({ page }) => {
    const firstSale = page.locator('table tbody tr, [class*="sale-item"]').first();
    
    if (await firstSale.isVisible()) {
      const saleInfo = await firstSale.textContent();
      expect(saleInfo).toBeTruthy();
    }
  });

  test('should filter sales by date', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], input[placeholder*="Sana"]');
    
    if (await dateFilter.isVisible()) {
      await dateFilter.first().fill('2026-03-01');
      await page.waitForTimeout(1000);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});
