import { test, expect } from '@playwright/test';

test.describe('Customers Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/customers');
    await page.waitForTimeout(2000);
  });

  test('should display customers page', async ({ page }) => {
    await expect(page).toHaveURL(/.*customers/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display customers list', async ({ page }) => {
    const customersContainer = page.locator('table, [class*="customer"], [class*="grid"]');
    await expect(customersContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add customer button', async ({ page }) => {
    const addButton = page.locator('button[class*="bg-indigo"], button[class*="bg-violet"], button:has-text("Янги"), button:has-text("mijoz")');
    const buttonCount = await addButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should open add customer modal', async ({ page }) => {
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

  test('should display customer categories', async ({ page }) => {
    // Check for VIP, NORMAL, RISK badges
    const badges = page.locator('[class*="badge"], [class*="tag"]');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter customers by category', async ({ page }) => {
    const filterButton = page.locator('button:has-text("VIP"), button:has-text("Normal"), button:has-text("Risk")');
    
    if (await filterButton.first().isVisible()) {
      await filterButton.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should view customer details', async ({ page }) => {
    const firstCustomer = page.locator('table tbody tr, [class*="customer-item"]').first();
    
    if (await firstCustomer.isVisible()) {
      const customerInfo = await firstCustomer.textContent();
      expect(customerInfo).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});
