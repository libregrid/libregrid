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

    // v36's scrolling is wheel-driven; setting scrollTop programmatically
    // does not feed the SSRM block loader. Wheel in steps so the lazy block
    // loader has time to fetch between scrolls.
    await grid.hover();
    for (let step = 0; step < 5; step += 1) {
      await page.mouse.wheel(0, 5_000);
      await page.waitForTimeout(400);
    }
    await expect.poll(async () =>
      grid.locator('[row-index]').evaluateAll((rows) =>
        rows.some(
          (row) =>
            Number(row.getAttribute('row-index')) > 300 && row.textContent?.includes('trade-'),
        ),
      ),
    ).toBe(true);

    await grid.getByRole('columnheader', { name: 'Quantity' }).click();
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
