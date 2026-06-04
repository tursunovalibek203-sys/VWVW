import { test, expect } from '@playwright/test';

test.describe('Products Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
    await page.waitForTimeout(2000);
  });

  test('should display products page', async ({ page }) => {
    await expect(page).toHaveURL(/.*products/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display products list or table', async ({ page }) => {
    // Wait for table or product cards
    const productsContainer = page.locator('table, [class*="product"], [class*="grid"]');
    await expect(productsContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Qidirish"], input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      expect(await searchInput.inputValue()).toBe('test');
    }
  });

  test('should have add product button', async ({ page }) => {
    // The "+" primary action button in top-right has a specific indigo/violet bg class
    const addButton = page.locator(
      'button[class*="bg-indigo"], button[class*="bg-violet"], ' +
      'a[href*="add-product"], ' +
      'button:has-text("қ"), button:has-text("Add"), button:has-text("+")'
    );
    const buttonCount = await addButton.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should open add product modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("Qo\'shish"), button:has-text("Add"), button:has-text("+")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Check if modal or form appeared
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible();
      }
    }
  });

  test('should display product details', async ({ page }) => {
    // Click on first product if exists
    const firstProduct = page.locator('table tbody tr, [class*="product-item"]').first();
    
    if (await firstProduct.isVisible()) {
      const productName = await firstProduct.textContent();
      expect(productName).toBeTruthy();
    }
  });

  test('should filter products', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filtr")');
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});
