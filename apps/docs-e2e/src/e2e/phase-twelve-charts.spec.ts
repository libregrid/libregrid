import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Integrated Charts', () => {
  test('creates a focused linked chart, updates it from grid data, and captures workspace state', async ({ page }) => {
    await page.goto('/charts');
    const grid = page.getByTestId('phase-twelve-grid'); const container = page.getByTestId('phase-twelve-chart-container');
    await expect(grid.locator('[row-index="0"]')).toContainText('United Kingdom');
    await page.getByRole('button', { name: 'Create sales chart' }).click();
    await expect(container.locator('.lgr-chart')).toHaveCount(1);
    await expect(page.getByText('Sales and profit chart linked to the visible market rows.')).toBeVisible();
    await page.getByRole('button', { name: 'Add $10k to UK sales' }).click();
    await expect(page.getByText('United Kingdom sales updated; the linked chart refreshed.')).toBeVisible();
    await page.getByRole('button', { name: 'Save chart state' }).click();
    await expect(page.getByText('Chart state captured. Persist this model with the user’s workspace.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear chart' }).click();
    await expect(container.getByText('Create the chart to start the comparison.')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.locator('button[aria-label*="dark theme"]').click(); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
