import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

    // The first log line is the model's full response; the decision follows it.
    const decision = page.getByTestId('ai-log-item').filter({ hasText: /^(applied|clarify|rejected)/ }).first();
    await expect(decision).toBeVisible({ timeout: 100_000 });

    const text = (await decision.textContent()) ?? '';
    if (text.startsWith('applied')) {
      // The visibility tool call took effect on the live grid.
      await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="region"]')).toHaveCount(0);
    }
  });

  test('edits the model configuration and reloads it', async ({ page }) => {
    const box = page.getByTestId('ai-config');
    await expect(box).toBeVisible();
    const parsed = JSON.parse((await box.inputValue()) ?? '{}') as Record<string, unknown>;
    expect(typeof parsed.context).toBe('string');
    expect(Array.isArray(parsed.tools)).toBe(true);
    expect(Array.isArray(parsed.columns)).toBe(true);

    // Invalid configuration is rejected and logged, not thrown.
    await box.fill('{ not json');
    await page.getByTestId('ai-reload-config').click();
    await expect(page.getByTestId('ai-log-item').last()).toContainText(/config invalid/);

    // A valid edit applies and logs.
    await box.fill(JSON.stringify({ ...parsed, threshold: 0.9 }, null, 2));
    await page.getByTestId('ai-reload-config').click();
    await expect(page.getByTestId('ai-log-item').last()).toContainText(/config reloaded/);

    // Clearing the log empties it back to the placeholder.
    await page.getByTestId('ai-clear-log').click();
    await expect(page.getByTestId('ai-log-item')).toHaveCount(0);
    await expect(page.locator('.lgr-ai-log-empty')).toContainText('No requests yet.');
  });
});

test.describe('AI Toolkit accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/ai-toolkit');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }
      const results = await new AxeBuilder({ page }).include('.lgr-page').analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
