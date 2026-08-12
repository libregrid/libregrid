import { test, expect } from '@playwright/test';

test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/grid');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('grid is visible in light mode by default', async ({ page }) => {
    const grid = page.locator('[data-testid="demo-grid"]');
    await expect(grid).toBeVisible();

    // Theme toggle button should show dark_mode icon in light mode
    const toggle = page.locator('button[aria-label*="dark theme"]');
    await expect(toggle).toBeVisible();
  });

  test('toggling to dark mode restyles grid without reload', async ({ page }) => {
    const grid = page.locator('[data-testid="demo-grid"]');
    await expect(grid).toBeVisible();

    // Get light mode background
    const lightBg = await page.evaluate(() => {
      const el = document.querySelector('.ag-root-wrapper');
      return el ? getComputedStyle(el).backgroundColor : '';
    });

    // Toggle to dark
    await page.locator('button[aria-label*="dark theme"]').click();

    // Wait for rAF to fire and theme to update
    await page.waitForTimeout(200);

    // Get dark mode background
    const darkBg = await page.evaluate(() => {
      const el = document.querySelector('.ag-root-wrapper');
      return el ? getComputedStyle(el).backgroundColor : '';
    });

    // Background should have changed
    expect(lightBg).not.toBe(darkBg);
    expect(darkBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(darkBg).not.toBe('rgb(255, 255, 255)');
  });

  test('toggling back to light restores original theme', async ({ page }) => {
    const grid = page.locator('[data-testid="demo-grid"]');
    await expect(grid).toBeVisible();

    // Get initial light background
    const initialBg = await page.evaluate(() => {
      const el = document.querySelector('.ag-root-wrapper');
      return el ? getComputedStyle(el).backgroundColor : '';
    });

    // Toggle to dark then back to light
    await page.locator('button[aria-label*="dark theme"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[aria-label*="light theme"]').click();
    await page.waitForTimeout(200);

    const restoredBg = await page.evaluate(() => {
      const el = document.querySelector('.ag-root-wrapper');
      return el ? getComputedStyle(el).backgroundColor : '';
    });

    expect(restoredBg).toBe(initialBg);
  });

  test('theme toggle button updates aria-label', async ({ page }) => {
    // Light mode: button says "Switch to dark theme"
    await expect(page.locator('button[aria-label*="dark theme"]')).toBeVisible();

    await page.locator('button[aria-label*="dark theme"]').click();
    await page.waitForTimeout(200);

    // Dark mode: button says "Switch to light theme"
    await expect(page.locator('button[aria-label*="light theme"]')).toBeVisible();
  });

  test('data-lgr-theme attribute reflects current mode', async ({ page }) => {
    // Light mode default
    await expect(page.locator('html')).toHaveAttribute('data-lgr-theme', 'light');

    // Toggle to dark
    await page.locator('button[aria-label*="dark theme"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('html')).toHaveAttribute('data-lgr-theme', 'dark');

    // Toggle back to light
    await page.locator('button[aria-label*="light theme"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator('html')).toHaveAttribute('data-lgr-theme', 'light');
  });
});
