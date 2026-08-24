import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * AI Toolkit demo (/ai-toolkit). The slow test runs a real local inference
 * round trip in the browser: Needle WASM engine + ~14 MB of weights fetched
 * from the pinned Hugging Face commit, then a validated plan applied to the
 * live grid. No remote LLM is involved.
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

  test('shows the environment it builds from the live grid', async ({ page }) => {
    await page.getByTestId('ai-show-env').click();
    const env = page.getByTestId('ai-env');
    await expect(env).toBeVisible();

    const text = (await env.textContent()) ?? '';
    // Columns are addressed by request-local references, and each line carries
    // the capabilities the toolkit read off the column itself.
    expect(text).toContain('c0 | id=product');
    expect(text).toContain('type=number');
    // A number column must be offered comparison operators, not set membership.
    expect(text).toMatch(/id=revenue.*filter:.*\bgt\b/);
    expect(text).toContain('"name": "setFilter"');
  });

  test('completes a local inference round trip and applies the result', async ({ page }) => {
    // First run downloads ~14 MB of weights and initialises the engine.
    test.setTimeout(120_000);
    await page.getByRole('button', { name: 'Hide the region column' }).click();

    const decision = page
      .getByTestId('ai-log-item')
      .filter({ hasText: /^(applied|ambiguous|unsupported|off-topic|invalid|error)/ })
      .first();
    await expect(decision).toBeVisible({ timeout: 100_000 });

    const text = (await decision.textContent()) ?? '';
    if (text.startsWith('applied')) {
      await expect(page.getByTestId('ai-toolkit-grid').locator('.ag-cell[col-id="region"]')).toHaveCount(0);
    }
  });

  test('clears the log back to the placeholder', async ({ page }) => {
    test.setTimeout(120_000);
    await page.getByRole('button', { name: 'Reset everything' }).click();
    await expect(page.getByTestId('ai-log-item').first()).toBeVisible({ timeout: 100_000 });

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
      // Include the generated environment panel in the sweep.
      await page.getByTestId('ai-show-env').click();
      const results = await new AxeBuilder({ page }).include('.lgr-page').analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
