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

  test('keeps the advanced-filter controls contained on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/advanced-filter-find');
    const grid = page.getByTestId('phase-eleven-grid');
    await expect(grid).toBeVisible();
    await expect(grid.locator('.lgr-advanced-filter')).toBeVisible();

    await page.getByRole('button', { name: 'Open advanced builder' }).click();
    const builder = page.getByTestId('phase-eleven-filter-parent').getByRole('dialog', { name: 'Advanced filter builder' });
    await expect(builder).toBeVisible();
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      builderWidth: document.querySelector<HTMLElement>('.lgr-advanced-filter-builder')?.getBoundingClientRect().width,
      hostWidth: document.querySelector<HTMLElement>('.lgr-advanced-filter-builder-host')?.getBoundingClientRect().width,
    }));
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(layout.builderWidth).toBeLessThanOrEqual(layout.hostWidth!);
  });

  test('does not expose an unsupported fullscreen action', async ({ page }) => {
    await page.goto('/advanced-filter-find');
    await page.getByRole('button', { name: 'Open advanced builder' }).click();
    const builder = page.getByRole('dialog', { name: 'Advanced filter builder' });
    await expect(builder.getByRole('button', { name: 'Full screen' })).toHaveCount(0);
  });
});
