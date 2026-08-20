import { test, expect } from '@playwright/test';

test.describe('Row Numbers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/row-numbers');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('shows the row-number column first with 1-based numbering', async ({ page }) => {
    const grid = page.getByTestId('row-numbers-grid');
    await expect(grid.locator('.ag-header-cell').first()).toHaveAttribute(
      'col-id',
      'ag-Grid-RowNumbersColumn',
    );
    await expect(grid.locator('.ag-row').first().locator('.ag-cell').first()).toHaveText('1');
    await expect(grid.locator('.ag-row').nth(1).locator('.ag-cell').first()).toHaveText('2');
    await expect(grid.locator('.ag-row').nth(2).locator('.ag-cell').first()).toHaveText('3');
  });

  test('clicking a row number selects the whole visible row', async ({ page }) => {
    const grid = page.getByTestId('row-numbers-grid');
    const row = grid.locator('.ag-row').nth(2);
    // 4 displayed columns (row number + name + region + sales).
    await expect(row.locator('.ag-cell')).toHaveCount(4);

    await row.locator('.ag-cell').first().click();
    await expect(row.locator('.ag-cell-range-selected')).toHaveCount(4);
  });

  test('turning rowNumbers off removes the column', async ({ page }) => {
    const grid = page.getByTestId('row-numbers-grid');
    await page.getByRole('button', { name: 'rowNumbers: on' }).click();
    await expect(grid.locator('.ag-header-cell[col-id="ag-Grid-RowNumbersColumn"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'rowNumbers: off' }).click();
    await expect(grid.locator('.ag-header-cell[col-id="ag-Grid-RowNumbersColumn"]')).toHaveCount(1);
  });

  test('the row resizer drags the row taller', async ({ page }) => {
    const grid = page.getByTestId('row-numbers-grid');
    const row = grid.locator('.ag-row').nth(1);
    // v36 sets the row height as an inline style on the row component, which
    // Playwright surfaces through the layout box rather than the style attribute.
    const startHeight = (await row.boundingBox())!.height;
    expect(startHeight).toBeGreaterThan(0);

    const handle = row.locator('.lgr-row-number-resizer');
    await expect(handle).toHaveCount(1);
    await handle.scrollIntoViewIfNeeded();

    // The page layout settles a few pixels after initial render; wait until
    // the handle's position stops moving before aiming at its 4px-tall band.
    let lastY = await handle.evaluate((el) => el.getBoundingClientRect().y);
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100);
      const y = await handle.evaluate((el) => el.getBoundingClientRect().y);
      if (y === lastY) break;
      lastY = y;
    }

    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();

    await expect.poll(async () => (await row.boundingBox())!.height).toBeGreaterThan(startHeight + 20);
  });

  test('the row resizer is hidden when disabled', async ({ page }) => {
    const grid = page.getByTestId('row-numbers-grid');
    await page.getByRole('button', { name: 'Row resizer: on' }).click();
    await expect(grid.locator('.lgr-row-number-resizer')).toHaveCount(0);
  });
});
