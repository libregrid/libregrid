import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The docs-only inventory is intentionally not a published package API.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { DEMO_EXAMPLES } from '../../../docs/src/app/docs/demo-examples';

const routes = [...new Set(DEMO_EXAMPLES.map((example) => example.route))];
for (const route of routes) {
  test(`${route}: every demo exposes the exact inventoried files`, async ({ page }) => {
    await page.goto(`/${route}${route === 'ai-toolkit' ? '?mock=1' : ''}`);
    for (const example of DEMO_EXAMPLES.filter((entry) => entry.route === route)) {
      const viewer = page.locator(`[data-demo-id="${example.id}"]`);
      await expect(viewer.locator('ag-grid-angular')).toBeVisible();
      await viewer
        .getByRole('button', { name: `Show code: ${example.title}`, exact: true })
        .click();
      await expect(viewer.locator('ag-grid-angular')).toBeHidden();
      for (const variant of example.variants) {
        await viewer.getByLabel('Framework', { exact: true }).selectOption(variant.framework);
        const code = viewer.locator('lgr-docs-code-example:visible');
        await expect(code.getByRole('tab', { selected: true })).toHaveText(variant.initialFile);
        for (const file of variant.files) {
          await code.getByRole('tab', { name: file, exact: true }).click();
          const source = readFileSync(
            resolve('apps/docs/examples', variant.directory, file),
            'utf8',
          );
          await expect.poll(() => code.locator('pre code').textContent()).toBe(source);
        }
      }
    }
  });
}

test('loads lazily, retries failed files, copies exact contents and remembers tabs', async ({
  page,
  context,
  browserName,
}) => {
  const requests: string[] = [];
  let fail = true;
  await page.route('**/examples/**', async (route) => {
    requests.push(route.request().url());
    if (fail && route.request().url().endsWith('main.ts')) await route.fulfill({ status: 503 });
    else await route.continue();
  });
  await page.goto('/group-editing');
  const viewer = page.locator('[data-demo-id="group-edit-allocation-grid"]');
  await expect(viewer.locator('.ag-row').first()).toBeVisible();
  expect(requests).toEqual([]);
  await viewer.getByRole('button', { name: 'Show code: Allocation rules' }).click();
  await expect(viewer.getByRole('alert')).toContainText('Could not load');
  fail = false;
  await viewer.getByRole('button', { name: 'Retry', exact: true }).click();
  const code = viewer.locator('lgr-docs-code-example:visible');
  const main = code.getByRole('tab', { name: 'main.ts', exact: true });
  await main.focus();
  await page.keyboard.press('End');
  await expect(code.getByRole('tab', { name: 'styles.css', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(main).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(code.getByRole('tab', { name: 'styles.css', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(main).toBeFocused();
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await code.getByRole('button', { name: 'Copy main.ts code' }).click();
    await expect(code.getByText('Copied to clipboard')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      readFileSync('apps/docs/examples/group-edit-allocation-grid/typescript/main.ts', 'utf8'),
    );
  }
  await viewer.getByLabel('Framework', { exact: true }).selectOption('Angular');
  await code.getByRole('tab', { name: 'app.component.html', exact: true }).click();
  await viewer.getByRole('button', { name: 'Show demo: Allocation rules' }).click();
  const count = requests.length;
  await viewer.getByRole('button', { name: 'Show code: Allocation rules' }).click();
  await expect(code.getByRole('tab', { selected: true })).toHaveText('app.component.html');
  await viewer.getByLabel('Framework', { exact: true }).selectOption('TypeScript');
  await expect(code.getByRole('tab', { selected: true })).toHaveText('main.ts');
  expect(requests).toHaveLength(count);
});

test('repeated toggles keep edited data, expansion and grid instances; viewers remain independent', async ({
  page,
}) => {
  await page.goto('/group-editing');
  const viewer = page.locator('[data-demo-id="group-edit-allocation-grid"]');
  const grid = viewer.locator('ag-grid-angular');
  const cell = grid.locator('.ag-row[row-id="carve"] .ag-cell[col-id="seats"]');
  await cell.dblclick();
  const editor = grid.locator('.ag-cell-inline-editing input');
  await editor.fill('20');
  await editor.press('Enter');
  await expect(cell).toHaveText('20');
  const group = grid.locator('.ag-row[row-id="ROOT_NODE_ID-venue-Foundry"]');
  await group.locator('.ag-group-expanded').click();
  await grid.evaluate((element) => {
    element.setAttribute('data-instance-check', 'original');
  });
  for (let i = 0; i < 3; i++) {
    await viewer.getByRole('button', { name: 'Show code: Allocation rules' }).click();
    await expect(viewer.getByLabel('Allocation rule', { exact: true })).toBeHidden();
    await expect(page.getByTestId('group-edit-policy-grid')).toBeVisible();
    await viewer.getByRole('button', { name: 'Show demo: Allocation rules' }).click();
    await expect(grid).toHaveAttribute('data-instance-check', 'original');
    await expect(group.locator('.ag-group-contracted')).toBeVisible();
  }
  await group.locator('.ag-group-contracted').click();
  await expect(cell).toHaveText('20');
});

for (const dark of [false, true])
  for (const mobile of [false, true]) {
    test(`viewer accessibility and layout: ${dark ? 'dark' : 'light'}, ${mobile ? 'mobile' : 'desktop'}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: mobile ? 390 : 1440, height: 1000 });
      await page.goto('/group-editing');
      if (dark) await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      const viewer = page.locator('[data-demo-id="group-edit-allocation-grid"]');
      await viewer.getByRole('button', { name: 'Show code: Allocation rules' }).click();
      await expect(viewer.locator('pre')).toBeVisible();
      const rejectCookies = page.getByRole('button', { name: 'Reject analytics', exact: true });
      if (await rejectCookies.isVisible()) await rejectCookies.click();
      await viewer.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .include('[data-demo-id="group-edit-allocation-grid"]')
        .analyze();
      expect(results.violations).toEqual([]);
      await viewer.screenshot({ path: testInfo.outputPath('viewer.png') });
    });
  }

test('Angular-only viewer preserves filters and row selection', async ({ page }) => {
  await page.goto('/angular');
  const viewer = page.locator('[data-demo-id="angular-grid"]');
  await viewer.locator('.ag-row[row-index="0"] .ag-checkbox-input').first().check({ force: true });
  await page.getByTestId('angular-filter-input').fill('Ada');
  for (let i = 0; i < 2; i++) {
    await viewer.getByRole('button', { name: 'Show code: Angular', exact: true }).click();
    await expect(viewer.getByLabel('Framework', { exact: true })).toHaveValue('Angular');
    await expect(viewer.locator('select option')).toHaveCount(1);
    await viewer.getByRole('button', { name: 'Show demo: Angular', exact: true }).click();
    await expect(viewer.getByText('Selected: 1', { exact: true })).toBeVisible();
    await expect(viewer.getByText('Displayed rows: 1', { exact: true })).toBeVisible();
    await expect(viewer.getByText('Filters active: 1', { exact: true })).toBeVisible();
  }
});

test('reports clipboard failure without claiming success', async ({ page }) => {
  await page.goto('/grid');
  const viewer = page.locator('[data-demo-id="demo-grid"]');
  await viewer.getByRole('button', { name: 'Show code: Grid', exact: true }).click();
  const code = viewer.locator('lgr-docs-code-example:visible');
  await expect(code.locator('pre code')).not.toBeEmpty();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Clipboard unavailable');
        },
      },
    });
    document.execCommand = () => false;
  });
  await code.getByRole('button', { name: 'Copy main.ts code', exact: true }).click();
  await expect(code.getByText('Copy failed', { exact: true })).toBeVisible();
  await expect(code.getByText('Copied to clipboard', { exact: true })).toHaveCount(0);
});
