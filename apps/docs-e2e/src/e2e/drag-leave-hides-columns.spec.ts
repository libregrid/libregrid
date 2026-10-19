import { test, expect, type Page } from '@playwright/test';

// Dragging a header out of the grid hides the column (Community's
// ColumnMoveService); `suppressDragLeaveHidesColumns` turns that off.
// Neither is reimplemented in LibreGrid, so this guards the integration.

async function dragRegionHeaderOutOfGrid(page: Page): Promise<void> {
  const header = page.getByRole('columnheader', { name: 'Region' });
  await header.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120)); // leave room above the grid to drop into
  const headerBox = (await header.boundingBox())!;
  const gridBox = (await page.getByTestId('demo-grid').boundingBox())!;
  const x = headerBox.x + headerBox.width / 2;
  const y = headerBox.y + headerBox.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 10, y + 5, { steps: 3 });
  await page.mouse.move(x, Math.max(gridBox.y - 60, 5), { steps: 12 });
  await page.mouse.up();
}

test.describe('Dragging a header out of the grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/grid');
    await expect(page.getByRole('columnheader', { name: 'Region' })).toBeVisible({ timeout: 15_000 });
  });

  test('hides the column by default', async ({ page }) => {
    await dragRegionHeaderOutOfGrid(page);
    await expect(page.getByRole('columnheader', { name: 'Region' })).toHaveCount(0);
  });

  test('keeps the column with suppressDragLeaveHidesColumns', async ({ page }) => {
    await page.evaluate(() => {
      const host = document.querySelector('ag-grid-angular');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).ng.getComponent(host).api.setGridOption('suppressDragLeaveHidesColumns', true);
    });
    await dragRegionHeaderOutOfGrid(page);
    await expect(page.getByRole('columnheader', { name: 'Region' })).toBeVisible();
  });
});
