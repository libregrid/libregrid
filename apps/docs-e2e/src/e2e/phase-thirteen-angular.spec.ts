import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 13 — Angular integration', () => {
  test('mirrors grid state into signals and stays accessible in light and dark', async ({ page }) => {
    await page.goto('/angular');
    const grid = page.getByTestId('angular-grid');
    await expect(grid.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });

    // Initial mirrored state: 4 rows displayed, none selected.
    await expect(page.getByText('Displayed rows: 4')).toBeVisible();
    await expect(page.getByText('Selected: 0')).toBeVisible();
    await expect(page.getByText('Filters active: 0')).toBeVisible();

    // Selecting a row updates the mirrored signal.
    await grid.locator('.ag-row[row-index="0"] .ag-checkbox-input').first().check({ force: true });
    await expect(page.getByText('Selected: 1')).toBeVisible();

    // Typing a filter updates the mirrored row count and filter model.
    await page.getByTestId('angular-filter-input').fill('Ada');
    await expect(page.getByText('Displayed rows: 1')).toBeVisible();
    await expect(page.getByText('Filters active: 1')).toBeVisible();

    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.locator('button[aria-label*="dark theme"]').click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});

