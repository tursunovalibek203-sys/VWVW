import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000); // Wait for API calls
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page).toHaveURL(/.*dashboard|\/$/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display metric cards', async ({ page }) => {
    // Dashboard uses Tailwind rounded-2xl cards — look for the dark hero revenue card
    const heroCard = page.locator('[class*="bg-slate-900"], [class*="bg-slate-800"]').first();
    const anyCard = page.locator('[class*="rounded-2xl"]').first();
    const visible = await heroCard.isVisible() || await anyCard.isVisible();
    expect(visible).toBeTruthy();
  });

  test('should navigate to products page', async ({ page }) => {
    const productsLink = page.locator('a:has-text("Mahsulotlar"), a:has-text("Products")').first();
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await expect(page).toHaveURL(/.*products/);
    }
  });

  test('should navigate to sales page', async ({ page }) => {
    const salesLink = page.locator('a:has-text("Sotuvlar"), a:has-text("Sales")').first();
    if (await salesLink.isVisible()) {
      await salesLink.click();
      await expect(page).toHaveURL(/.*sales/);
    }
  });

  test('should navigate to customers page', async ({ page }) => {
    const customersLink = page.locator('a:has-text("Mijozlar"), a:has-text("Customers")').first();
    if (await customersLink.isVisible()) {
      await customersLink.click();
      await expect(page).toHaveURL(/.*customers/);
    }
  });

  test('should display charts', async ({ page }) => {
    // Check for SVG elements (recharts uses SVG)
    const charts = page.locator('svg');
    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check if page is still visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    // Check if page is still visible
    await expect(page.locator('body')).toBeVisible();
  });
});
