import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.describe('Cell Selection and Clipboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/selection');
    await expect(page.getByTestId('selection-grid')).toBeVisible({ timeout: 15_000 });
  });
  test('drags a cell range and copies it through the public API', async ({ page }) => {
    const cells = page.getByTestId('selection-grid').locator('.ag-cell');
    await cells.nth(0).dragTo(cells.nth(4));
    await expect(page.getByText('Ranges: 1', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Copy selected range' }).click();
    await expect(page.getByText(/Copied \d+ characters/)).toBeVisible();
    await page.getByRole('button', { name: 'Clear range' }).click();
    await expect(page.getByText('Ranges: 0', { exact: false })).toBeVisible();
  });
  test('supports multiple ranges and fill-handle numeric series', async ({ page }) => {
    const cells = page.getByTestId('selection-grid').locator('.ag-cell');
    await cells.nth(1).dragTo(cells.nth(7));
    await expect(page.locator('.lgr-fill-handle')).toBeVisible();
    await page.locator('.lgr-fill-handle').dragTo(cells.nth(16));
    await expect(cells.nth(16)).toHaveText('11');
    await page.keyboard.down('Control');
    await cells.nth(0).dragTo(cells.nth(2));
    await page.keyboard.up('Control');
    await expect(page.getByText('Ranges: 2', { exact: false })).toBeVisible();
  });
});
test.describe('Cell Selection accessibility', () => {
  for (const mode of ['light', 'dark'] as const)
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/selection');
      await expect(page.getByTestId('selection-grid')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
});
