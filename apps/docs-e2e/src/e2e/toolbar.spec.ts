import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function dragByPointer(source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Drag source or target is not visible');
  const page = source.page();
  const from = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const to = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Give drag sources a beat to arm before the threshold-crossing move.
  await page.waitForTimeout(100);
  await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 16 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

test.describe('Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    // The docs header puts the toolbar drop zones below a 900px viewport.
    // Keep both the grid header drag source and all targets on screen so this
    // exercises the real pointer bridge rather than synthetic events.
    await page.setViewportSize({ width: 1800, height: 1200 });
    await page.goto('/toolbar');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.lgr-toolbar .lgr-row-group-drop-zone')).toBeVisible();
    const consentNotice = page.locator('#klaro-cookie-notice');
    if (await consentNotice.isVisible()) {
      await consentNotice.getByRole('button', { name: 'Reject analytics' }).click();
    }
  });

  test('renders quick filter, find, and embedded drop zones', async ({ page }) => {
    await expect(page.getByRole('searchbox', { name: 'Quick filter' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Find in grid' })).toBeVisible();
    await expect(page.locator('.lgr-toolbar .lgr-row-group-drop-zone')).toContainText('Drag columns here to group');
    await expect(page.locator('.lgr-toolbar .lgr-pivot-drop-zone')).toContainText('Drag columns here to pivot');
  });

  test('quick filter narrows rows', async ({ page }) => {
    const input = page.getByRole('searchbox', { name: 'Quick filter' });
    await input.fill('France');
    await expect
      .poll(() => page.locator('.ag-row').count())
      .toBeLessThan(40);
  });

  test('dragging a column header into the toolbar row group zone groups the grid', async ({ page }) => {
    const zone = page.locator('.lgr-toolbar .lgr-row-group-drop-zone');
    await dragByPointer(page.locator('.ag-header-cell[col-id="country"]'), zone);

    await expect(zone).toContainText('country');
    await expect(page.locator('.ag-row[aria-expanded]').first()).toBeVisible();
    // Grouped columns leave the visible header set for the auto group column.
    await expect(page.locator('.ag-header-cell[col-id="ag-Grid-AutoColumn"]')).toBeVisible();
  });

  test('dragging a column header into the standalone header panel zone groups too', async ({ page }) => {
    const zone = page.locator('.lgr-header-drop-zones .lgr-row-group-drop-zone');
    await dragByPointer(page.locator('.ag-header-cell[col-id="region"]'), zone);
    await expect(zone).toContainText('region');
  });

  test('dragging a Columns panel row into the toolbar pivot zone pivots', async ({ page }) => {
    const zone = page.locator('.lgr-toolbar .lgr-pivot-drop-zone');
    // The Material CDK adapter owns panel drags; the bridge forwards them.
    await expect(page.locator('.lgr-columns-row.cdk-drag').first()).toBeAttached();
    await dragByPointer(page.locator('.lgr-columns-row[data-column-id="region"]'), zone);
    await expect(zone).toContainText('region');
  });

  test('ineligible columns are rejected by the row group zone', async ({ page }) => {
    const zone = page.locator('.lgr-toolbar .lgr-row-group-drop-zone');
    // sales has enableValue only — no enableRowGroup.
    await dragByPointer(page.locator('.ag-header-cell[col-id="sales"]'), zone);
    await expect(zone).toContainText('Drag columns here to group');
    await expect(zone.locator('.lgr-row-group-drop-zone-member')).toHaveCount(0);
  });
});

test.describe('Toolbar accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/toolbar');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
