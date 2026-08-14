import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 12 — Integrated Charts & Sparklines', () => {
  test('creates a linked range chart, configures it, saves/restores it, and renders sparklines', async ({ page }) => {
    await page.goto('/charts');
    const grid = page.getByTestId('phase-twelve-grid'); const container = page.getByTestId('phase-twelve-chart-container');
    await expect(grid.locator('[row-index="0"]')).toContainText('United Kingdom'); await expect(grid.locator('.lgr-sparkline')).toHaveCount(4);
    await page.getByRole('button', { name: 'Select chart range' }).click(); await page.getByRole('button', { name: 'Create range chart' }).click();
    await expect(container.locator('.lgr-chart')).toHaveCount(1); await expect(page.getByTestId('phase-twelve-status')).toContainText('Chart created');
    await page.getByRole('button', { name: 'Open chart configuration' }).click(); const panel = page.getByRole('dialog', { name: 'Chart configuration' }); await expect(panel).toBeVisible(); await panel.getByLabel('Chart type').selectOption('pie');
    await page.getByRole('button', { name: 'Save chart state' }).click(); await expect(page.getByTestId('phase-twelve-status')).toContainText('saved'); await page.getByRole('button', { name: 'Restore chart' }).click(); await expect(page.getByTestId('phase-twelve-status')).toContainText('restored');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); await page.locator('button[aria-label*="dark theme"]').click(); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
