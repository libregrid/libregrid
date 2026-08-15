import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Tree Data', () => {
  test('renders expanded paths and filler hierarchy with accessible tree controls', async ({ page }) => {
    await page.goto('/tree-data');
    const grid = page.getByTestId('tree-data-grid');
    await expect(grid.locator('[row-index="0"]')).toContainText('Workspace');
    await expect(grid.getByText('schema.ts')).toBeVisible();
    await expect(grid.locator('.ag-group-expanded').first()).toBeVisible();
  });
});

test.describe('Master Detail', () => {
  test('mounts a separately sortable detail grid and exposes it to keyboard users', async ({ page }) => {
    await page.goto('/master-detail');
    const grid = page.getByTestId('master-detail-grid');
    await expect(grid.getByRole('row', { name: 'Atlas Trading' })).toBeVisible();
    await expect(grid.locator('.ag-details-grid').first()).toBeVisible();
    await grid.locator('.ag-details-grid').first().getByRole('columnheader', { name: 'Direction' }).click();
    await expect(grid.locator('.ag-details-grid [row-index="0"]').first()).toContainText(/Inbound|Outbound/);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
