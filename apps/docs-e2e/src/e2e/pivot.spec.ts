import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Pivot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pivot');
    await expect(page.locator('[data-testid="pivot-grid"] .ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('renders generated nested headers and toggles pivot mode', async ({ page }) => {
    await expect(page.locator('.ag-header-group-cell')).toBeVisible();
    await page.getByRole('button', { name: 'Toggle pivot mode' }).click();
    await expect(page.locator('.ag-header-group-cell')).toHaveCount(0);
    await page.getByRole('button', { name: 'Toggle pivot mode' }).click();
    await expect(page.locator('.ag-header-group-cell')).toBeVisible();
  });

  test('has no axe violations in light and dark themes', async ({ page }) => {
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
