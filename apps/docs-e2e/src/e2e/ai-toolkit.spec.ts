import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('AI Toolkit BYOM workbench', () => {
  // The flagship layout splits demo and guide into two columns; a wide viewport
  // keeps every demo column rendered so visibility assertions see all cells.
  test.use({ viewport: { width: 1720, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // ?mock=1 selects the hidden deterministic transport so tests never need
    // a live gateway or a Turnstile token; the demo page itself always uses
    // the HTTP endpoint and exposes no selector.
    await page.goto('/ai-toolkit?mock=1');
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

  test('applies the query directly when review is off', async ({ page }) => {
    await page.getByRole('button', { name: SUGGESTION }).click();
    await expect(page.getByTestId('ai-status')).toContainText('Applied 1 change(s) to the grid');
    await expect(page.getByTestId('ai-proposal')).toHaveCount(0);
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="order"]')).toHaveCount(3);
  });

  test('shows the exact system prompt, live request, and strict output envelope when review is on', async ({ page }) => {
    await page.getByTestId('ai-show-review').click();
    await page.getByRole('button', { name: SUGGESTION }).click();
    await expect(page.getByTestId('ai-proposal')).toBeVisible();
    await expect(page.getByTestId('ai-inspector')).toBeVisible();
    await expect(page.getByTestId('ai-system-prompt')).toContainText('Preserve current state');
    await expect(page.getByTestId('ai-system-prompt')).toContainText('Never invent row values');

    await page.getByText('Request sent to your server').click();
    const request = page.getByTestId('ai-request');
    await expect(request).toContainText('libregrid.ai/v1');
    await expect(request).toContainText('amountUsd');
    await expect(request).toContainText('startsWith');
    await expect(request).toContainText('closedDate');
    await expect(request).toContainText('currentState');

    await page.getByText('Output schema the model must follow').click();
    const envelope = page.getByTestId('ai-envelope');
    await expect(envelope).toContainText('propertiesToIgnore');
    await expect(envelope).toContainText('additionalProperties');
  });

  test('generates an advanced multi-column filter proposal without applying it automatically', async ({ page }) => {
    await page.getByTestId('ai-show-review').click();
    await page.getByRole('button', { name: SUGGESTION }).click();
    await expect(page.getByTestId('ai-proposal')).toBeVisible();
    await expect(page.getByTestId('ai-diff')).toContainText('Filters');
    await expect(page.getByTestId('ai-diff')).toContainText('amountUsd > 5000');
    await expect(page.getByTestId('ai-diff')).toContainText('region in [North America]');
    await expect(page.getByTestId('ai-response')).toContainText('greaterThan');
    await expect(page.getByTestId('ai-response')).toContainText('North America');
    await expect(page.getByTestId('ai-response')).toContainText('Hardware');

    // The proposal is dry-run: all six records remain until explicit apply.
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="order"]')).toHaveCount(6);
    await page.getByTestId('ai-apply').click();
    await expect(page.getByTestId('ai-status')).toContainText('Applied 1 change(s) to the grid');
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="order"]')).toHaveCount(3);
  });

  test('applies visibility only after confirmation and supports discard', async ({ page }) => {
    await page.getByTestId('ai-show-review').click();
    await page.getByRole('button', { name: 'Hide the sales rep column' }).click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(6);
    await page.getByTestId('ai-discard').click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(6);

    await page.getByRole('button', { name: 'Hide the sales rep column' }).click();
    await page.getByTestId('ai-apply').click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(0);
  });

  test('always uses the HTTP endpoint and exposes no mode selector or endpoint input', async ({ page }) => {
    await expect(page.getByTestId('ai-mode')).toHaveCount(0);
    await expect(page.getByTestId('ai-endpoint')).toHaveCount(0);
    await expect(page.getByTestId('ai-apply-query')).toHaveText('Apply Query');
    await expect(page.getByTestId('ai-reset')).toBeVisible();
  });

  test('explains the request flow and disables Apply Query for an empty prompt', async ({ page }) => {
    await expect(page.getByText(/validated against the live grid → sent to your server/)).toBeVisible();
    await page.getByTestId('ai-prompt').fill('');
    await expect(page.getByTestId('ai-apply-query')).toBeDisabled();
    await page.getByTestId('ai-prompt').fill('Sort by sales amount, highest first');
    await expect(page.getByTestId('ai-apply-query')).toBeEnabled();
  });

  test('shows a clear error banner when the gateway request fails', async ({ page }) => {
    // HTTP mode with Turnstile blocked: the request fails before the network
    // call and the page must surface it instead of hanging.
    await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
    await page.goto('/ai-toolkit');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('ai-apply-query').click();
    await expect(page.getByTestId('ai-error')).toBeVisible();
    await expect(page.getByTestId('ai-error')).toContainText('Turnstile');
    await expect(page.getByTestId('ai-spinner')).toHaveCount(0);
  });

  test('shows a spinner while a query is running', async ({ page }) => {
    await page.getByRole('button', { name: SUGGESTION }).click();
    await expect(page.getByTestId('ai-spinner')).toBeVisible();
    await expect(page.getByTestId('ai-status')).toContainText('Applied 1 change(s) to the grid');
    await expect(page.getByTestId('ai-spinner')).toHaveCount(0);
  });

  test('resets the grid to its original state after applied changes', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide the sales rep column' }).click();
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(0);

    await page.getByTestId('ai-reset').click();
    await expect(page.getByTestId('ai-status')).toContainText('Grid reset');
    await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="salesRep"]')).toHaveCount(6);
  });

  test('turnstile host does not break the accessibility tree', async ({ page }) => {
    await expect(page.getByTestId('ai-turnstile')).toBeAttached();
    const results = await new AxeBuilder({ page }).include('[data-testid="ai-turnstile"]').analyze();
    expect(results.violations).toEqual([]);
  });
});

const SUGGESTION = 'Show sales over $5,000 from North America, hardware only';

test.describe('AI Toolkit accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/ai-toolkit?mock=1');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      // Open the review and traffic boxes so axe covers the full surface.
      await page.getByTestId('ai-show-review').click();
      await page.getByRole('button', { name: SUGGESTION }).click();
      await expect(page.getByTestId('ai-proposal')).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
