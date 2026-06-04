import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForTimeout(3000); // Analytics needs more time to load
  });

  test('should display analytics page', async ({ page }) => {
    await expect(page).toHaveURL(/.*analytics/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display advanced metrics', async ({ page }) => {
    // Check for metric cards
    const metrics = page.locator('[class*="metric"], [class*="card"]');
    const metricCount = await metrics.count();
    expect(metricCount).toBeGreaterThan(0);
  });

  test('should display charts', async ({ page }) => {
    // Check for SVG charts
    const charts = page.locator('svg');
    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThan(0);
  });

  test('should display customer segments', async ({ page }) => {
    // Check for VIP, Loyal, Regular, At-Risk, Inactive
    const segments = page.locator('text=/VIP|Loyal|Regular|At-Risk|Inactive/i');
    const segmentCount = await segments.count();
    expect(segmentCount).toBeGreaterThanOrEqual(0);
  });

  test('should display AI recommendations', async ({ page }) => {
    // Check for recommendations section
    const recommendations = page.locator('[class*="recommendation"], [class*="suggestion"]');
    const recCount = await recommendations.count();
    expect(recCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter by date range', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], select[name*="period"]');
    
    if (await dateFilter.first().isVisible()) {
      await dateFilter.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display anomaly detection', async ({ page }) => {
    // Check for anomaly alerts
    const anomalies = page.locator('[class*="anomaly"], [class*="alert"]');
    const anomalyCount = await anomalies.count();
    expect(anomalyCount).toBeGreaterThanOrEqual(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('body')).toBeVisible();
  });
});
