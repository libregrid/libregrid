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
    // The aggregation status panel appears in the grid status bar once a
    // range is selected, then hides again when the range is cleared.
    const statusBar = page.getByTestId('selection-grid').locator('.lgr-status-bar');
    await expect(statusBar.getByText('Count', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Copy selected range' }).click();
    await expect(page.getByText('Copied selected range', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Clear range' }).click();
    await expect(statusBar.getByText('Count', { exact: false })).toBeHidden();
  });
  test('copies a pointer-dragged range to the browser clipboard', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permission automation is Chromium-specific.');
    await page.goto('/selection');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    });

    const cells = page.getByTestId('selection-grid').locator('[col-id="first"].ag-cell');
    await cells.nth(0).dragTo(cells.nth(2));
    await expect(page.locator('.ag-cell-range-selected')).toHaveCount(3);

    await page.getByRole('button', { name: 'Copy selected range' }).click();
    await expect(page.getByText('Copied selected range', { exact: false })).toBeVisible();
    await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(
      'first\r\n1\r\n3\r\n5',
    );
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
    const statusBar = page.getByTestId('selection-grid').locator('.lgr-status-bar');
    await expect(statusBar.getByText('Count', { exact: false })).toBeVisible();
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
