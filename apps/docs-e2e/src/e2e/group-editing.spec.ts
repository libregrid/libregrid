import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const grid = (page: Page, name: string) => page.getByTestId(`group-edit-${name}-grid`);
const row = (page: Page, name: string, id: string) =>
  grid(page, name).locator(`.ag-row[row-id="${id}"]`);
const cell = (page: Page, name: string, id: string, col = 'seats') =>
  row(page, name, id).locator(`.ag-cell[col-id="${col}"]`);
const FOUNDRY = 'ROOT_NODE_ID-venue-Foundry';
const ORCHARD = 'ROOT_NODE_ID-venue-Orchard';

async function edit(page: Page, name: string, id: string, col: string, value: string) {
  await expect(cell(page, name, id, col)).toHaveCount(1);
  await cell(page, name, id, col).dblclick();
  const editor = grid(page, name).locator('.ag-cell-inline-editing input');
  await expect(editor).toBeVisible();
  await editor.fill(value);
  await editor.press('Enter');
  await expect(editor).toHaveCount(0);
}

async function expectPlaces(page: Page, name: string, values: number[], col = 'seats') {
  for (const [index, id] of ['carve', 'print', 'bind'].entries()) {
    await expect(cell(page, name, id, col)).toHaveText(String(values[index]));
  }
}

test.describe('Workshop group-editing guide', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/group-editing');
    await expect(cell(page, 'allocation', FOUNDRY)).toHaveText('48');
  });

  for (const [strategy, values, total] of [
    ['uniform', [24, 24, 24], 72],
    ['percentage', [12, 24, 36], 72],
    ['increment', [16, 24, 32], 72],
    ['overwrite', [72, 72, 72], 216],
  ] as const) {
    test(`matches the comparison table for ${strategy}`, async ({ page }) => {
      await page.getByLabel('Allocation rule', { exact: true }).selectOption(strategy);
      await edit(page, 'allocation', FOUNDRY, 'seats', '72');
      await expectPlaces(page, 'allocation', [...values]);
      await expect(cell(page, 'allocation', FOUNDRY)).toHaveText(String(total));
      await expect(cell(page, 'allocation', ORCHARD)).toHaveText('24');
      await page.getByRole('button', { name: 'Reset allocation', exact: true }).click();
      await expectPlaces(page, 'allocation', [8, 16, 24]);
    });
  }

  test('rounds, cancels, and refreshes after a leaf edit', async ({ page }) => {
    await edit(page, 'allocation', FOUNDRY, 'seats', '73');
    await expectPlaces(page, 'allocation', [25, 24, 24]);
    await cell(page, 'allocation', FOUNDRY).dblclick();
    const editor = grid(page, 'allocation').locator('.ag-cell-inline-editing input');
    await editor.fill('100');
    await editor.press('Escape');
    await expect(cell(page, 'allocation', FOUNDRY)).toHaveText('73');
    await edit(page, 'allocation', 'carve', 'seats', '10');
    await expect(cell(page, 'allocation', FOUNDRY)).toHaveText('58');
  });

  test('demonstrates defaults, column overrides, locks and a custom aggregate', async ({
    page,
  }) => {
    await edit(page, 'policy', FOUNDRY, 'minutes', '90');
    await expectPlaces(page, 'policy', [90, 90, 90], 'minutes');
    await edit(page, 'policy', FOUNDRY, 'briefing', 'Arrive early');
    for (const id of ['carve', 'print', 'bind']) {
      await expect(cell(page, 'policy', id, 'briefing')).toHaveText('Arrive early');
    }
    await cell(page, 'policy', FOUNDRY, 'stations').dblclick();
    await expect(grid(page, 'policy').locator('.ag-cell-inline-editing')).toHaveCount(0);
    await cell(page, 'policy', ORCHARD, 'minutes').dblclick();
    await expect(grid(page, 'policy').locator('.ag-cell-inline-editing')).toHaveCount(0);
    await edit(page, 'policy', FOUNDRY, 'roomWindow', '120');
    await expectPlaces(page, 'policy', [120, 120, 120], 'minutes');
    await expect(cell(page, 'policy', FOUNDRY, 'roomWindow')).toHaveText('120');
  });

  test('uses equipment as the allocation basis', async ({ page }) => {
    await edit(page, 'equipment', FOUNDRY, 'seats', '60');
    await expectPlaces(page, 'equipment', [20, 10, 30]);
    await expect(cell(page, 'equipment', FOUNDRY)).toHaveText('60');
  });

  test('enforces priority capacity and rounds kit orders to whole packs', async ({ page }) => {
    await edit(page, 'capacity', FOUNDRY, 'seats', '50');
    await expectPlaces(page, 'capacity', [24, 12, 14]);
    await edit(page, 'capacity', FOUNDRY, 'seats', '90');
    await expectPlaces(page, 'capacity', [24, 12, 14]);
    await expect(cell(page, 'capacity', FOUNDRY)).toHaveText('50');
    await expect(page.getByTestId('capacity-status')).toContainText(
      'Enter a whole number from 0 to 72',
    );
    await edit(page, 'capacity', FOUNDRY, 'kits', '50');
    await expectPlaces(page, 'capacity', [18, 18, 18], 'kits');
    await expect(cell(page, 'capacity', FOUNDRY, 'kits')).toHaveText('54');
  });

  test('makes uneven hierarchy allocation visible', async ({ page }) => {
    await edit(page, 'nested', FOUNDRY, 'seats', '80');
    await expectPlaces(page, 'nested', [40, 20, 20]);
    await expect(cell(page, 'nested', `${FOUNDRY}-craft-Paper`)).toHaveText('40');
  });

  test('isolates a pivot edit to one shift', async ({ page }) => {
    const morning = grid(page, 'pivot')
      .locator('.ag-header-cell')
      .filter({ hasText: 'Morning' })
      .first();
    const evening = grid(page, 'pivot')
      .locator('.ag-header-cell')
      .filter({ hasText: 'Evening' })
      .first();
    const morningId = await morning.getAttribute('col-id');
    const eveningId = await evening.getAttribute('col-id');
    expect(morningId).toBeTruthy();
    expect(eveningId).toBeTruthy();
    await edit(page, 'pivot', FOUNDRY, morningId!, '40');
    await expect(cell(page, 'pivot', FOUNDRY, morningId!)).toHaveText('40');
    await expect(cell(page, 'pivot', FOUNDRY, eveningId!)).toHaveText('24');
    await expect(cell(page, 'pivot', ORCHARD, morningId!)).toHaveText('10');
  });

  test('allocates through generated tree parents', async ({ page }) => {
    const root = grid(page, 'tree').locator('.ag-row').filter({ hasText: 'Open studio' }).first();
    const id = await root.getAttribute('row-id');
    await edit(page, 'tree', id!, 'places', '64');
    await expect(cell(page, 'tree', 'bench', 'places')).toHaveText('32');
    await expect(cell(page, 'tree', 'press', 'places')).toHaveText('16');
    await expect(cell(page, 'tree', 'rollers', 'places')).toHaveText('16');
  });

  test('moves a session without changing its allocation', async ({ page }) => {
    await edit(page, 'move', 'carve', 'venue', 'Orchard');
    await expect(cell(page, 'move', FOUNDRY)).toHaveText('40');
    await expect(cell(page, 'move', ORCHARD)).toHaveText('32');
    await expect(cell(page, 'move', 'carve')).toHaveText('8');
  });

  test('provides working navigation, eight demos, and readable mobile layout', async ({
    page,
  }, testInfo) => {
    await expect(page.locator('[data-testid^="group-edit-"][data-testid$="-grid"]')).toHaveCount(8);
    await page.locator('#allocation').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('allocation-desktop.png') });
    await page.getByRole('link', { name: 'Respect capacity', exact: true }).click();
    await expect(page).toHaveURL(/#constraints$/);
    await expect(
      page.getByRole('heading', { name: '3. Translate operational constraints into writes' }),
    ).toBeInViewport();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#allocation').scrollIntoViewIfNeeded();
    const controls = page.locator('.controls');
    await controls.scrollIntoViewIfNeeded();
    await expect(page.getByLabel('Allocation rule', { exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Reset allocation' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('allocation-mobile.png') });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  });

  test('passes accessibility checks in both themes', async ({ page }) => {
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.emulateMedia({ colorScheme: 'dark' });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
