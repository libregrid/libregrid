import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('SSRM advanced demo', () => {
  test('lazily expands server groups, refreshes on filter, and accepts server pivot fields', async ({ page }) => {
    await page.goto('/server-side-advanced');
    const grid = page.getByTestId('server-side-advanced-grid');
    await expect(grid.locator('[row-index="0"]')).toContainText('Commodities');
    await grid.locator('[row-index="0"] .ag-group-contracted, [row-index="0"] .ag-group-value').first().click();
    await expect(grid.locator('[row-index="1"]')).toContainText(/Arbitrage|Macro|Momentum/);
    await page.getByRole('button', { name: 'Filter Equities' }).click();
    await expect(grid.locator('[row-index="0"]')).toContainText('Equities');
    await page.getByRole('button', { name: 'Toggle server pivot' }).click();
    await expect(grid.locator('.ag-header-cell[col-id="Jan_sum"]')).toBeVisible();
  });

  test('has no axe violations in light and dark themes', async ({ page }) => {
    await page.goto('/server-side-advanced');
    await expect(page.getByTestId('server-side-advanced-grid').locator('[row-index="0"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});

test.describe('Viewport row-model demo', () => {
  test('renders streamed row pushes and retains a stable viewport on scroll', async ({ page }) => {
    await page.goto('/viewport');
    const grid = page.getByTestId('viewport-grid');
    await expect(grid.locator('[row-index="0"]')).toContainText('quote-0');
    await grid.locator('.ag-center-cols-viewport').evaluate((viewport) => {
      viewport.scrollTop = 5_000;
      viewport.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await expect.poll(() => grid.locator('[row-index]').evaluateAll((rows) => rows.some((row) => Number(row.getAttribute('row-index')) > 50 && row.textContent?.includes('quote-')))).toBe(true);
  });
});
