import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function gotoRoute(page: Page): Promise<void> {
  await page.goto('/calculated-columns');
  await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
}

function cell(page: Page, row: number, colId: string) {
  return page.locator('.ag-row').nth(row).locator(`.ag-cell[col-id="${colId}"]`);
}

test.describe('Calculated columns', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await gotoRoute(page);
  });

  test('computes declared calculated columns', async ({ page }) => {
    const profit0 = cell(page, 0, 'profit');
    const revenue = Number((await cell(page, 0, 'revenue').innerText()).replace(/[^0-9]/g, ''));
    const cost = Number((await cell(page, 0, 'cost').innerText()).replace(/[^0-9]/g, ''));
    await expect(profit0).toHaveText(String(revenue - cost));
    // Unit Price = revenue / units (IF guard keeps non-numeric from showing).
    await expect(cell(page, 0, 'unitPrice')).not.toHaveText(/^\s*$/);
  });

  test('adds a calculated column through the column menu dialog', async ({ page }) => {
    await cell(page, 0, 'revenue').hover();
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await expect(page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' })).toBeVisible();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('.lgr-calc-dialog-expression').fill('[revenue] * 2');
    await expect(cell(page, 0, 'lgr-calc-1')).toHaveText(
      String(Number((await cell(page, 0, 'revenue').innerText()).replace(/[^0-9]/g, '')) * 2),
    );
    // Close the dialog.
    await dialog.locator('.lgr-calc-dialog-close').click();
    await expect(dialog).toHaveCount(0);
  });

  test('shows formula errors for invalid expressions', async ({ page }) => {
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();
    const dialog = page.locator('.lgr-calc-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('.lgr-calc-dialog-expression').fill('[missing] + 1');
    await expect(cell(page, 0, 'lgr-calc-1')).toHaveText('#REF!');
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('logs calculated column events', async ({ page }) => {
    await expect(page.locator('.lgr-calc-log li').first()).toContainText('grid ready');
    await page.locator('.ag-header-cell[col-id="cost"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();
    await expect(page.locator('.lgr-calc-log').getByText('calculatedColumnCreated', { exact: false })).toBeVisible();
  });
});

test.describe('Calculated columns accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/calculated-columns');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
