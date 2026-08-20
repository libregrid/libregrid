import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 11 — Advanced Filter, Find, and Rich Select', () => {
  test('filters through the builder, navigates Find matches, and commits rich-select values', async ({ page }) => {
    await page.goto('/advanced-filter-find');
    const grid = page.getByTestId('phase-eleven-grid');
    await expect(grid.locator('[row-index="0"]')).toContainText('United Kingdom');
    await page.getByRole('button', { name: 'Open advanced builder' }).click();
    const builder = page.getByRole('dialog', { name: 'Advanced Filter' });
    await expect(builder).toBeVisible();
    const addCondition = builder.getByRole('button', { name: 'Add condition' });
    await expect(addCondition).toBeFocused();
    expect((await new AxeBuilder({ page }).include('.lgr-advanced-filter-builder-overlay').analyze()).violations).toEqual([]);
    await addCondition.click();
    await builder.getByRole('button', { name: 'Apply' }).click();
    await expect(grid.locator('[row-index="0"]')).toContainText('United Kingdom');
    const find = page.getByTestId('phase-eleven-find');
    await find.fill('United');
    await expect(page.locator('.lgr-match-count')).toContainText('2 matches');
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
    const builder = page.getByRole('dialog', { name: 'Advanced Filter' });
    await expect(builder).toBeVisible();
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      builderWidth: document.querySelector<HTMLElement>('.lgr-advanced-filter-builder')?.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBe(layout.clientWidth);
    expect(layout.builderWidth).toBeLessThanOrEqual(layout.viewportWidth - 16);
  });

  test('does not expose an unsupported fullscreen action', async ({ page }) => {
    await page.goto('/advanced-filter-find');
    await page.getByRole('button', { name: 'Open advanced builder' }).click();
    const builder = page.getByRole('dialog', { name: 'Advanced Filter' });
    await expect(builder.getByRole('button', { name: 'Full screen' })).toHaveCount(0);
  });

  test('synchronizes grouped rules with the editable expression and restores focus', async ({ page }) => {
    await page.goto('/advanced-filter-find');
    const trigger = page.getByRole('button', { name: 'Open advanced builder' });
    await trigger.click();
    const builder = page.getByRole('dialog', { name: 'Advanced Filter' });
    await expect(builder).toHaveAttribute('aria-modal', 'true');
    await builder.getByRole('button', { name: 'Add condition' }).click();
    const expression = builder.locator('.lgr-advanced-filter-builder-expression');
    await expression.fill('[country] CONTAINS');
    await expect(builder.locator('.lgr-advanced-filter-builder-error')).toContainText('Expected a filter value');
    await expect(builder.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await expression.fill('[country] CONTAINS "United" OR [sales] > 100');
    await expect(builder.locator('.lgr-advanced-filter-condition-row')).toHaveCount(2);
    await expect(builder.getByRole('radio', { name: 'Any condition' }).first()).toHaveAttribute('aria-checked', 'true');
    await builder.getByRole('button', { name: 'Close advanced filter builder' }).click();
    await expect(trigger).toBeFocused();
  });
});
