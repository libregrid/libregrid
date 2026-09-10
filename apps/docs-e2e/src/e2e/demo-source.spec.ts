import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The docs-only inventory is intentionally not a published package API.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { DEMO_EXAMPLES } from '../../../docs/src/app/docs/demo-examples';

// Execute trusted repository examples in an isolated browser page. The docs
// viewer itself only fetches text and never executes a displayed source file.
for (const example of DEMO_EXAMPLES) {
  const variant = example.variants.find((entry) => entry.framework === 'TypeScript');
  if (!variant) continue;
  test(`${example.id}: standalone TypeScript example mounts and its controls work`, async ({
    page,
  }) => {
    const directory = resolve('apps/docs/examples', variant.directory);
    const bundle = await build({
      entryPoints: [resolve(directory, 'main.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      tsconfig: 'tsconfig.base.json',
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/example-under-test/**', async (route) => {
      const url = route.request().url();
      if (url.endsWith('/main.js'))
        await route.fulfill({ contentType: 'text/javascript', body: bundle.outputFiles[0]!.text });
      else if (url.endsWith('/styles.css'))
        await route.fulfill({
          contentType: 'text/css',
          body: readFileSync(resolve(directory, 'styles.css'), 'utf8'),
        });
      else
        await route.fulfill({
          contentType: 'text/html',
          body: readFileSync(resolve(directory, 'index.html'), 'utf8').replace(
            './main.ts',
            './main.js',
          ),
        });
    });
    await page.goto('/example-under-test/index.html');
    await expect(page.locator('#grid .ag-root')).toBeVisible();
    await expect(page.locator('#grid .ag-row').first()).toBeVisible();
    const button = page.locator('body > button').first();
    if (await button.count()) await button.click();
    // Allow queued gridReady, chart and datasource work to complete.
    await expect.poll(() => errors).toEqual([]);
    if (example.id === 'group-edit-allocation-grid') {
      await page.getByLabel('Allocation rule').selectOption('percentage');
      const group = page.locator(
        '.ag-row[row-id="ROOT_NODE_ID-venue-Foundry"] .ag-cell[col-id="seats"]',
      );
      await group.dblclick();
      await page.locator('.ag-cell-inline-editing input').fill('72');
      await page.locator('.ag-cell-inline-editing input').press('Enter');
      await expect(page.locator('.ag-row[row-id="carve"] .ag-cell[col-id="seats"]')).toHaveText(
        '12',
      );
    }
    if (example.id === 'ai-toolkit-grid') {
      await expect(page.locator('#status')).toContainText('Sort Sales amount');
    }
    expect(errors).toEqual([]);
  });
}
