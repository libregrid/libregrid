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
    const menu = page.locator('.lgr-column-menu');
    await expect(menu).toBeVisible();
    // The menu item sits under the demo's "Open Filters panel" button below
    // the grid, so drive it with the keyboard like menus.spec does.
    const filterItem = menu.getByRole('menuitem', { name: 'Filter' });
    await filterItem.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.lgr-column-filter-popup .lgr-set-filter, .lgr-set-filter').first()).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search filter values' })).toBeVisible();
  });

  test('applies Country and Product header Set Filters through their grid-managed controls', async ({ page }) => {
    // The Filters panel opens over the grid by default; close it so the
    // header filter buttons underneath are clickable.
    await page.getByRole('tab', { name: 'Filters' }).click();
    await expect(page.locator('.lgr-filters-tool-panel')).not.toBeVisible();
    const grid = page.getByTestId('filters-grid');
    const displayedRows = () => page.evaluate(() => window.ng.getComponent(document.querySelector('lgr-filters-demo'))?.api?.getDisplayedRowCount());

    const countryHeader = grid.getByRole('columnheader', { name: 'Country' });
    await countryHeader.locator('.ag-header-cell-filter-button').click();
    const countryFilter = page.locator('.ag-filter .lgr-set-filter');
    await expect(countryFilter).toBeVisible();
    await expect(countryFilter.locator('.lgr-set-filter-actions')).toHaveCount(0);
    await countryFilter.locator('.lgr-set-filter-value', { hasText: 'Germany' }).locator('input').uncheck();
    await page.locator('.ag-filter-apply-panel').getByRole('button', { name: 'Apply' }).click();
    await expect.poll(displayedRows).toBe(3);

    await page.reload();
    await expect(grid).toBeVisible({ timeout: 15_000 });
    await page.getByRole('tab', { name: 'Filters' }).click();
    await expect(page.locator('.lgr-filters-tool-panel')).not.toBeVisible();
    const productHeader = grid.getByRole('columnheader', { name: 'Product' });
    await productHeader.locator('.ag-header-cell-filter-button').click();
    const productFilter = page.locator('.ag-filter .lgr-set-filter');
    await expect(productFilter).toBeVisible();
    await productFilter.locator('.lgr-set-filter-value', { hasText: 'Widget' }).locator('input').uncheck();
    await expect.poll(displayedRows).toBe(2);
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
