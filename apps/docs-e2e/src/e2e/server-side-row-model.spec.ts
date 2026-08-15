import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('server-side row model demo', () => {
  test('loads lazy datasource blocks and accepts a server-side sort', async ({ page }) => {
    const gridErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && message.text().startsWith('AG Grid:')) {
        gridErrors.push(message.text());
      }
    });

    await page.goto('/server-side');
    const grid = page.getByTestId('server-side-grid');
    await expect(grid.locator('[row-index="0"]')).toContainText('trade-1');

    // The demo paginates (100 rows/page), so the grid's scroll range never
    // exceeds one page — reaching row 300 means paging forward, not scrolling.
    const nextPage = page.getByRole('button', { name: 'Next Page' });
    for (let step = 0; step < 3; step += 1) {
      await nextPage.click();
      await expect(grid.locator(`[row-index="${(step + 1) * 100}"]`)).toBeVisible();
    }
    await expect(grid.locator('[row-index="300"]')).toContainText('trade-301');

    // Sorting doesn't return the pager to page 1 on its own.
    await grid.getByRole('columnheader', { name: 'Quantity' }).click();
    await page.getByRole('button', { name: 'First Page' }).click();
    await expect(grid.locator('[row-index="0"]')).toContainText('trade-1');
    expect(gridErrors).toEqual([]);
  });
});

test.describe('server-side row model accessibility', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${colorScheme} theme has no axe violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/server-side');
      await expect(page.getByTestId('server-side-grid').locator('[row-index="0"]')).toContainText('trade-1');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
