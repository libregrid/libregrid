import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function editCell(page: Page, row: number, colId: string, value: string): Promise<void> {
  const cell = page.locator('.ag-row').nth(row).locator(`.ag-cell[col-id="${colId}"]`);
  await cell.dblclick();
  const input = cell.locator('input');
  await expect(input).toBeVisible();
  await input.fill(value);
  await page.keyboard.press('Enter');
  await expect(input).toHaveCount(0);
}

test.describe('Batch edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await page.goto('/batch-edit');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('starts idle with the batch buttons in their initial state', async ({ page }) => {
    await expect(page.getByTestId('batch-status')).toHaveText('Idle');
    await expect(page.getByTestId('batch-start')).toBeEnabled();
    await expect(page.getByTestId('batch-commit')).toBeDisabled();
    await expect(page.getByTestId('batch-cancel')).toBeDisabled();
  });

  test('commits a batch: staged edits land in one pass', async ({ page }) => {
    await page.getByTestId('batch-start').click();
    await expect(page.getByTestId('batch-status')).toHaveText('Batch editing');

    await editCell(page, 0, 'country', 'Alpha');
    await editCell(page, 1, 'region', 'Zulu');

    // The staged cell carries the batch marker until the commit.
    const first = page.locator('.ag-row').nth(0).locator('.ag-cell[col-id="country"]');
    await expect(first).toHaveClass(/ag-cell-batch-edit/);

    await page.getByTestId('batch-commit').click();
    await expect(page.getByTestId('batch-status')).toHaveText('Idle');
    await expect(first).toHaveText('Alpha');
    await expect(page.locator('.ag-row').nth(1).locator('.ag-cell[col-id="region"]')).toHaveText('Zulu');

    const log = page.getByTestId('batch-event-log');
    await expect(log).toContainText('batchEditingStarted');
    await expect(log).toContainText('batchEditingStopped (2 changes)');
  });

  test('cancels a batch: staged edits are reverted to their original values', async ({ page }) => {
    const first = page.locator('.ag-row').nth(0).locator('.ag-cell[col-id="country"]');
    const original = (await first.innerText()).trim();

    await page.getByTestId('batch-start').click();

    // Stage the edit with Enter (editor closes) — exactly the flow a user
    // runs before clicking Cancel. The v36 engine only reverts open editors,
    // so BatchEditModule restores the staged value itself on cancel.
    await first.dblclick();
    const input = first.locator('input');
    await expect(input).toBeVisible();
    await input.fill('Discarded');
    await page.keyboard.press('Enter');
    await expect(input).toHaveCount(0);
    await expect(first).toHaveText('Discarded');

    await page.getByTestId('batch-cancel').click();

    await expect(page.getByTestId('batch-status')).toHaveText('Idle');
    await expect(first).toHaveText(original);
    await expect(page.getByTestId('batch-event-log')).toContainText('batchEditingStopped (0 changes)');
  });
});

test.describe('Batch edit accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/batch-edit');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
