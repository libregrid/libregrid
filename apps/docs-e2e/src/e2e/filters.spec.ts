import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/filters');
    await expect(page.getByTestId('filters-grid')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.lgr-filters-tool-panel')).toBeVisible();
  });

  test('searches and expands filter cards through the side-bar panel', async ({ page }) => {
    const panel = page.locator('.lgr-filters-tool-panel');
    await panel.getByRole('searchbox', { name: 'Search filters' }).fill('Country');
    await expect(panel.getByRole('group', { name: 'Country filter' })).toBeVisible();
    await expect(panel.getByRole('group', { name: 'Region filter' })).not.toBeVisible();
    await panel.getByRole('searchbox', { name: 'Search filters' }).fill('');
    await panel.getByRole('button', { name: 'Expand all filters' }).click();
    await expect(panel.locator('details[open]')).toHaveCount(3);
    await expect(panel.getByRole('combobox', { name: 'Country filter type' })).toHaveValue('selection');
    await expect(panel.getByRole('combobox', { name: 'Region filter type' })).toHaveValue('combo');
  });

  test('opens the Set Filter from the Country column menu', async ({ page }) => {
    const menuButton = page.getByRole('columnheader', { name: 'Country' }).locator('.ag-header-cell-menu-button');
    await menuButton.click();
    await expect(page.locator('.lgr-column-menu')).toBeVisible();
    await page.locator('.lgr-column-menu').getByText('Filter', { exact: true }).click();
    await expect(page.locator('.lgr-set-filter')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search filter values' })).toBeVisible();
  });
});

test.describe('Filters accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/filters');
      await expect(page.getByTestId('filters-grid')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
