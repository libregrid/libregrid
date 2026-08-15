import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Excel Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/excel-export');
    await expect(page.locator('.ag-root-wrapper').first()).toBeVisible({ timeout: 15_000 });
  });

  test('downloads a workbook from the Export button', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-single').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('trades.xlsx');
    await expect(page.getByText('Downloaded trades.xlsx')).toBeVisible();
  });

  test('exports multiple sheets in one file', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-multiple').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('multi.xlsx');
  });

  test('offers Export in the context menu', async ({ page }) => {
    // Open the menu on a leaf row: group rows have an aria-expanded cell.
    const leafCell = page
      .locator('.ag-row')
      .filter({ hasNot: page.locator('.ag-cell[aria-expanded]') })
      .first()
      .locator('.ag-cell')
      .first();
    await leafCell.click({ button: 'right' });
    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();
    // The Export entry carries the csvExport/excelExport submenu.
    await expect(menu.locator('.lgr-menu-item', { hasText: 'Export' })).toBeVisible();
  });

  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/excel-export');
      await expect(page.locator('.ag-root-wrapper').first()).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
        await page.waitForTimeout(200);
      }
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
