import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/filters');
    await expect(page.getByTestId('filters-grid')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.lgr-filter-panel')).toBeVisible();
  });

  test('adds and removes filter cards through the Add Filter type-ahead', async ({ page }) => {
    const panel = page.locator('.lgr-filter-panel');
    await panel.getByRole('button', { name: 'Add Filter' }).click();

    const search = panel.getByRole('combobox', { name: 'Search filter columns' });
    await search.fill('Count');
    // Typing re-renders the type-ahead; the search box must keep focus.
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('Count');
    await expect(panel.getByRole('option', { name: 'Country' })).toBeVisible();
    await expect(panel.getByRole('option', { name: 'Region' })).toHaveCount(0);

    await panel.getByRole('option', { name: 'Country' }).click();

    // Picking a column drops in one card version: the selectable filter,
    // defaulting to Simple Filter.
    const countryCard = panel.locator('.lgr-filter-card').filter({ hasText: 'Country' }).first();
    await expect(countryCard).toBeVisible();
    await expect(countryCard.locator('.lgr-filter-card-expand')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(countryCard.locator('.lgr-selectable-filter')).toBeVisible();
    await expect(countryCard.locator('.lgr-simple-filter')).toBeVisible();

    // Switch to Selection Filter to mount the Set Filter.
    await countryCard.getByRole('combobox', { name: 'Filter type' }).selectOption('1');
    await expect(countryCard.locator('.lgr-set-filter')).toBeVisible();
    await expect(
      countryCard.getByRole('searchbox', { name: 'Search filter values' }),
    ).toBeVisible();

    // Deleting the card clears it and returns the column to the type-ahead.
    await countryCard.getByRole('button', { name: 'Delete Country filter' }).click();
    await expect(panel.locator('.lgr-filter-card').filter({ hasText: 'Country' })).toHaveCount(0);
  });

  test('switches a Status card between Simple and Selection filters', async ({ page }) => {
    const panel = page.locator('.lgr-filter-panel');
    await panel.getByRole('button', { name: 'Add Filter' }).click();
    const search = panel.getByRole('combobox', { name: 'Search filter columns' });
    await search.fill('Status');
    await panel.getByRole('option', { name: 'Status' }).click();

    const statusCard = panel.locator('.lgr-filter-card').filter({ hasText: 'Status' }).first();
    await expect(statusCard).toBeVisible();

    // New cards default to Simple Filter (operator + input + AND/OR).
    const typeSelect = statusCard.getByRole('combobox', { name: 'Filter type' });
    await expect(typeSelect).toHaveValue('0');
    await expect(statusCard.locator('.lgr-simple-filter')).toBeVisible();
    await expect(
      statusCard.getByRole('combobox', { name: 'Primary filtering operator' }),
    ).toBeVisible();

    // Switching to Selection Filter mounts the Set Filter.
    await typeSelect.selectOption('1');
    await expect(statusCard.locator('.lgr-set-filter')).toBeVisible();
    await expect(statusCard.getByRole('searchbox', { name: 'Search filter values' })).toBeVisible();
  });

  test('opens the selectable filter from the Country column menu', async ({ page }) => {
    const menuButton = page
      .getByRole('columnheader', { name: 'Country' })
      .locator('.ag-header-cell-menu-button');
    await menuButton.click();
    const menu = page.locator('.lgr-column-menu');
    await expect(menu).toBeVisible();
    // The menu item sits under the demo's "Open Filters panel" button below
    // the grid, so drive it with the keyboard like menus.spec does.
    const filterItem = menu.getByRole('menuitem', { name: 'Filter' });
    await filterItem.focus();
    await page.keyboard.press('Enter');
    const popup = page
      .locator('.lgr-column-filter-popup .lgr-selectable-filter, .lgr-selectable-filter')
      .first();
    await expect(popup).toBeVisible();
    await popup.getByRole('combobox', { name: 'Filter type' }).selectOption('1');
    await expect(popup.locator('.lgr-set-filter')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search filter values' })).toBeVisible();
  });

  test('applies Country and Product header filters through the selectable filter', async ({
    page,
  }) => {
    // The Filters panel opens over the grid by default; close it so the
    // header filter buttons underneath are clickable.
    await page.getByRole('tab', { name: 'Filters' }).click();
    await expect(page.locator('.lgr-filter-panel')).not.toBeVisible();
    const grid = page.getByTestId('filters-grid');
    const displayedRows = () =>
      page.evaluate(() =>
        window.ng
          .getComponent(document.querySelector('lgr-filters-demo'))
          ?.api?.getDisplayedRowCount(),
      );

    const countryHeader = grid.getByRole('columnheader', { name: 'Country' });
    await countryHeader.locator('.ag-header-cell-filter-button').click();
    const countryFilter = page.locator('.ag-filter .lgr-selectable-filter').first();
    await expect(countryFilter).toBeVisible();
    await countryFilter.getByRole('combobox', { name: 'Filter type' }).selectOption('1');
    const countrySet = countryFilter.locator('.lgr-set-filter');
    await expect(countrySet).toBeVisible();
    await countrySet
      .locator('.lgr-set-filter-value', { hasText: 'Germany' })
      .locator('input')
      .uncheck();
    await countrySet
      .locator('.lgr-set-filter-actions')
      .getByRole('button', { name: 'Apply' })
      .click();
    await expect.poll(displayedRows).toBe(33); // 40 rows − 7 Germany rows

    await page.reload();
    await expect(grid).toBeVisible({ timeout: 15_000 });
    await page.getByRole('tab', { name: 'Filters' }).click();
    await expect(page.locator('.lgr-filter-panel')).not.toBeVisible();
    const productHeader = grid.getByRole('columnheader', { name: 'Product' });
    await productHeader.locator('.ag-header-cell-filter-button').click();
    const productFilter = page.locator('.ag-filter .lgr-selectable-filter').first();
    await expect(productFilter).toBeVisible();
    await productFilter.getByRole('combobox', { name: 'Filter type' }).selectOption('1');
    const productSet = productFilter.locator('.lgr-set-filter');
    await expect(productSet).toBeVisible();
    await productSet
      .locator('.lgr-set-filter-value', { hasText: 'Widget' })
      .locator('input')
      .uncheck();
    await expect.poll(displayedRows).toBe(30); // 40 rows − 10 Widget rows
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
