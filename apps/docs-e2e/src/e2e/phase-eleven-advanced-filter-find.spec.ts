import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 11 — Advanced Filter, Find, and Rich Select', () => {
  test('filters through the builder, navigates Find matches, and commits rich-select values', async ({ page }) => {
    await page.goto('/advanced-filter-find');
    const grid = page.getByTestId('phase-eleven-grid');
    await expect(grid.locator('[row-index="0"]')).toContainText('United Kingdom');
    await page.getByRole('button', { name: 'Open advanced builder' }).click();
    const parent = page.getByTestId('phase-eleven-filter-parent');
    await expect(parent.getByRole('dialog', { name: 'Advanced filter builder' })).toBeVisible();
    await parent.getByRole('button', { name: 'Add condition' }).click();
    await parent.getByRole('button', { name: 'Apply' }).click();
    await expect(grid.locator('[row-index="0"]')).toContainText('United Kingdom');
    const find = page.getByTestId('phase-eleven-find');
    await find.fill('United');
    await expect(page.getByText(/matches/)).toContainText('2 matches');
    await page.getByRole('button', { name: 'Next match' }).click();
    await expect(grid.locator('.lgr-find-match-active')).toBeVisible();
    const rich = page.getByTestId('phase-eleven-rich-select');
    await rich.locator('[row-index="0"] [col-id="status"]').dblclick();
    const input = rich.locator('.lgr-rich-select input'); await input.fill('Published'); await input.press('Enter');
    await expect(rich.locator('[row-index="0"] [col-id="status"]')).toContainText('Published');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.locator('button[aria-label*="dark theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-lgr-theme', 'dark');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
