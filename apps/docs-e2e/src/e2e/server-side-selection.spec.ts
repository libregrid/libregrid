import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GRID = 'ssrm-selection-grid';

test.describe('server-side selection demo', () => {
  test.beforeEach(async ({ page }) => {
    const gridErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().startsWith('AG Grid:')) {
        gridErrors.push(message.text());
      }
    });
    await page.goto('/server-side-selection');
    const grid = page.getByTestId(GRID);
    await expect(grid.locator('[row-index="0"]')).toContainText('trade-1');
    // The footer is attached once the first rows hydrate.
    await expect(page.getByTestId('ssrm-selection-footer-host')).toContainText('Total Selected:', {
      timeout: 15_000,
    });
    expect(gridErrors).toEqual([]);
  });

  test('captures row selection into the spec and reports the total', async ({ page }) => {
    const grid = page.getByTestId(GRID);
    const footer = page.getByTestId('ssrm-selection-footer-host');
    await expect(footer).toContainText('Total Selected: 0');

    await grid.locator('[row-index="0"] .ag-checkbox-input').first().click();
    await expect(footer).toContainText('Total Selected: 1');
    await expect(footer).toContainText('Selected on current page: 1');
  });

  test('Select All and Deselect All manage the whole spec', async ({ page }) => {
    const footer = page.getByTestId('ssrm-selection-footer-host');
    await footer.getByRole('button', { name: 'Select All (10000)' }).click();
    await expect(footer).toContainText('Total Selected: 10000');

    await footer.getByRole('button', { name: 'Deselect All' }).click();
    await expect(footer).toContainText('Total Selected: 0');
  });

  test('Show All Selected makes the selection the dataset (R6)', async ({ page }) => {
    const grid = page.getByTestId(GRID);
    const footer = page.getByTestId('ssrm-selection-footer-host');

    await grid.locator('[row-index="0"] .ag-checkbox-input').first().click();
    await expect(footer).toContainText('Show All Selected (1)');

    await footer.getByRole('button', { name: 'Show All Selected (1)' }).click();
    // The datasource now serves only the selected rows: one row, and the
    // toggle flips to "Show All Records".
    await expect(grid.locator('[row-index="0"]')).toContainText('trade-1');
    await expect(grid.locator('[row-index="1"]')).toBeHidden();
    await expect(footer.getByRole('button', { name: 'Show All Records' })).toBeVisible();

    await footer.getByRole('button', { name: 'Show All Records' }).click();
    // Exiting the view restores the full dataset: the pager total returns to
    // 10,000 and the top row is rendered (rows are virtualised).
    await expect(grid).toContainText('of 10,000');
    await expect(grid.locator('[row-index="0"]')).toContainText('trade-1');
  });
});

test.describe('server-side selection accessibility', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${colorScheme} theme has no axe violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/server-side-selection');
      await expect(
        page.getByTestId('ssrm-selection-footer-host'),
      ).toContainText('Total Selected:', { timeout: 15_000 });
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
