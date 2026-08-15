import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function dragByPointer(source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Drag source or target is not visible');
  const page = source.page();
  const from = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const to = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height * 0.75 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

async function dropColumn(source: Locator, target: Locator): Promise<void> {
  const page = source.page();
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragenter', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
}

test.describe('Columns Tool Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/columns');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.lgr-columns-tool-panel')).toBeVisible();
  });

  test('toggles column visibility with a labelled checkbox', async ({ page }) => {
    const region = page.getByRole('checkbox', { name: 'Show Region' });
    await expect(region).toBeChecked();
    await region.uncheck();
    await expect(region).not.toBeChecked();
    await expect(page.locator('.ag-header-cell[col-id="region"]')).not.toBeVisible();
    await region.check();
    await expect(page.locator('.ag-header-cell[col-id="region"]')).toBeVisible();
  });

  test('groups and aggregates with keyboard-accessible controls', async ({ page }) => {
    const headerDropZone = page.getByRole('region', { name: 'Row Groups', exact: true });
    await expect(headerDropZone).not.toBeVisible();
    await page.getByRole('button', { name: 'Group by Country' }).click();
    await expect(page.locator('.ag-row[aria-expanded]').first()).toBeVisible();
    await expect(headerDropZone).toBeVisible();
    await expect(headerDropZone.getByRole('button', { name: 'Remove country from row groups' })).toBeVisible();
    const addValue = page.getByRole('button', { name: /Add value (Sales|Units)/ }).first();
    const valueMember = page.getByRole('button', { name: /Remove (Sales|Units) from values/ }).first();
    if (await addValue.isVisible()) await addValue.click();
    await expect(valueMember).toBeVisible();
  });

  test('reorders column leaves through Material CDK drag and drop', async ({ page }) => {
    const country = page.getByRole('treeitem').filter({
      has: page.getByRole('checkbox', { name: 'Show Country' }),
    });
    const product = page.getByRole('treeitem').filter({
      has: page.getByRole('checkbox', { name: 'Show Product' }),
    });

    await dragByPointer(country, product);

    await expect(page.locator('.lgr-columns-list > [role="treeitem"]')).toHaveText([
      'RegionPin Region leftPin Region rightMove Region upMove Region down',
      'ProductPin Product leftPin Product rightMove Product upMove Product down',
      'CountryPin Country leftPin Country rightMove Country upMove Country down',
      'SalesPin Sales leftPin Sales rightMove Sales upMove Sales down',
      'UnitsPin Units leftPin Units rightMove Units upMove Units down',
    ]);
  });

  test('adds an eligible column dropped into the Values zone', async ({ page }) => {
    const sales = page.getByRole('treeitem').filter({
      has: page.getByRole('checkbox', { name: 'Show Sales' }),
    });
    const values = page.locator(".lgr-columns-drop-zone[aria-label='Drop columns into Values']");

    await page.getByRole('button', { name: 'Remove Sales from values' }).click();
    await expect(page.getByRole('button', { name: 'Add value Sales' })).toBeVisible();
    await dropColumn(sales, values);

    await expect(page.getByRole('button', { name: 'Remove Sales from values' })).toBeVisible();
  });

  test('groups an eligible column dropped into the Row Groups zone', async ({ page }) => {
    const country = page.getByRole('treeitem').filter({
      has: page.getByRole('checkbox', { name: 'Show Country' }),
    });
    const rowGroups = page.locator(".lgr-columns-drop-zone[aria-label='Drop columns into Row Groups']");

    await dropColumn(country, rowGroups);

    await expect(rowGroups.getByRole('button', { name: 'Remove Country from row groups' })).toBeVisible();
    await expect(page.locator('.ag-row[aria-expanded]').first()).toBeVisible();
  });

  test('enables pivoting from the tool panel and accepts a pivot column', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Column Labels (Pivot)' })).toBeVisible();
    await page.getByRole('button', { name: 'Add pivot Region' }).click();
    await expect(page.getByRole('button', { name: 'Remove Region from pivots' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Enable pivot mode' }).check();
    await expect(page.locator('.ag-header-group-cell').first()).toBeVisible();
    const search = page.getByRole('searchbox', { name: 'Search columns' });
    await search.fill('Sales');
    // Pivot mode lists the generated result columns, so 'Sales' matches
    // several pivot intersections; the first suffices to prove the filter.
    await expect(page.getByRole('checkbox', { name: 'Show Sales' }).first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Show Country' })).not.toBeVisible();
  });

  test('adds an eligible column dropped into the Pivot zone', async ({ page }) => {
    const region = page.getByRole('treeitem').filter({
      has: page.getByRole('checkbox', { name: 'Show Region' }),
    });
    const pivots = page.locator(".lgr-columns-drop-zone[aria-label='Drop columns into Column Labels (Pivot)']");
    await dropColumn(region, pivots);
    await expect(pivots.getByRole('button', { name: 'Remove Region from pivots' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Enable pivot mode' }).check();
    await expect(page.locator('.ag-header-group-cell').first()).toBeVisible();
  });

  test('opens and closes the shared column chooser', async ({ page }) => {
    await page.getByRole('button', { name: 'Open column chooser' }).click();
    const dialog = page.getByRole('dialog', { name: 'Column chooser' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close column chooser' }).click();
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Columns Tool Panel Accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/columns');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
