import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Row Grouping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/row-grouping');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('group rows are displayed with aggregate values', async ({ page }) => {
    const rows = page.locator('.ag-row');
    await expect(rows.first()).toBeVisible();
    // groupDefaultExpanded: 1 → the five country groups show their city subgroups.
    expect(await rows.count()).toBeGreaterThan(5);
    // Aggregates land in the sales column (aggFunc: 'sum').
    await expect(page.locator('.ag-row [col-id="sales"]').first()).not.toBeEmpty();
  });

  test('group rows expose aria-expanded reflecting groupDefaultExpanded', async ({ page }) => {
    const expandedRows = page.locator('.ag-row[aria-expanded="true"]');
    await expect(expandedRows.first()).toBeVisible();
    expect(await expandedRows.count()).toBe(5); // five country groups, each expanded

    const collapsedRows = page.locator('.ag-row[aria-expanded="false"]');
    expect(await collapsedRows.count()).toBeGreaterThan(0); // city subgroups stay collapsed
  });

  test('axe a11y violations light theme', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe a11y violations dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
