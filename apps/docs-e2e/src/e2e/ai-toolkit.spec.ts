import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('AI Toolkit BYOM workbench', () => {
  // The flagship layout splits demo and guide into two columns; a wide viewport
  // keeps every demo column rendered so visibility assertions see all cells.
  test.use({ viewport: { width: 1720, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-toolkit');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('explains the three-module architecture and never requests a provider key', async ({ page }) => {
    const architecture = page.locator('.lgr-ai-architecture');
    await expect(architecture.getByText('@libregrid/ai-toolkit', { exact: true })).toBeVisible();
    await expect(architecture.getByText('@libregrid/ai-client', { exact: true })).toBeVisible();
    await expect(architecture.getByText('POST /v1/grid-command', { exact: true })).toBeVisible();
    await expect(page.getByText(/Provider keys never enter the browser/)).toBeVisible();
    await expect(page.getByLabel(/api key/i)).toHaveCount(0);
  });

  test('shows the exact system prompt, live request, and strict output envelope', async ({ page }) => {
    await page.getByTestId('ai-show-env').click();
    await expect(page.getByTestId('ai-inspector')).toBeVisible();
    await expect(page.getByTestId('ai-system-prompt')).toContainText('Preserve current state');
    await expect(page.getByTestId('ai-system-prompt')).toContainText('Never invent row values');

    await page.getByText('Live grid schema and current state request').click();
    const request = page.getByTestId('ai-request');
    await expect(request).toContainText('libregrid.ai/v1');
    await expect(request).toContainText('amountUsd');
    await expect(request).toContainText('startsWith');
    await expect(request).toContainText('closedDate');
    await expect(request).toContainText('currentState');

    await page.getByText('Strict provider output envelope').click();
    const envelope = page.getByTestId('ai-envelope');
    await expect(envelope).toContainText('propertiesToIgnore');
    await expect(envelope).toContainText('additionalProperties');
  });

  test('generates an advanced multi-column filter proposal without applying it automatically', async ({ page }) => {
    await page.getByRole('button', { name: SUGGESTION }).click();
    await expect(page.getByTestId('ai-proposal')).toBeVisible();
    await expect(page.getByTestId('ai-diff')).toContainText('filter');
    await expect(page.getByTestId('ai-response')).toContainText('greaterThan');
    await expect(page.getByTestId('ai-response')).toContainText('North America');
    await expect(page.getByTestId('ai-response')).toContainText('Hardware');

    // The proposal is dry-run: all six records remain until explicit apply.
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="order"]')).toHaveCount(6);
    await page.getByTestId('ai-apply').click();
    await expect(page.getByTestId('ai-status')).toContainText('Applied 1 validated feature change');
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="order"]')).toHaveCount(3);
  });

  test('applies visibility only after confirmation and supports discard', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide the sales rep column' }).click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(6);
    await page.getByTestId('ai-discard').click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(6);

    await page.getByRole('button', { name: 'Hide the sales rep column' }).click();
    await page.getByTestId('ai-apply').click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(0);
  });

  test('offers an external endpoint mode without exposing provider configuration', async ({ page }) => {
    await page.getByTestId('ai-mode').selectOption('http');
    const endpoint = page.getByTestId('ai-endpoint');
    await expect(endpoint).toBeEnabled();
    await expect(endpoint).toHaveValue('/v1/grid-command');
  });
});

const SUGGESTION = 'Show sales over $5,000 from North America, hardware only';

test.describe('AI Toolkit accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/ai-toolkit');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      await page.getByTestId('ai-show-env').click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
