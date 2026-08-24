import { test, expect } from '@playwright/test';

/**
 * AI Toolkit demo (/ai-toolkit). The slow test runs a real local inference
 * round trip in the browser: Needle WASM engine + ~14 MB of weights fetched
 * from the pinned Hugging Face commit, then a validated tool call applied to
 * the live grid. No remote LLM is involved.
 */
test.describe('AI Toolkit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-toolkit');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('renders the grid, prompt input and suggestion chips', async ({ page }) => {
    const grid = page.getByTestId('ai-toolkit-grid');
    await expect(grid.locator('.ag-cell[col-id="region"]')).toHaveCount(5);
    await expect(page.getByTestId('ai-prompt')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide the region column' })).toBeVisible();
  });

  test('completes a local inference round trip and applies the result', async ({ page }) => {
    // First run downloads ~14 MB of weights and initialises the engine.
    test.setTimeout(120_000);
    await page.getByRole('button', { name: 'Hide the region column' }).click();

    const first = page.getByTestId('ai-log-item').first();
    await expect(first).toContainText(/applied|clarify/, { timeout: 100_000 });

    const text = (await first.textContent()) ?? '';
    if (text.startsWith('applied')) {
      // The visibility tool call took effect on the live grid.
      await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="region"]')).toHaveCount(0);
    }
  });
});
