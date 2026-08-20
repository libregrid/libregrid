import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function gotoRoute(page: Page): Promise<void> {
  await page.goto('/calculated-columns');
  await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
}

function cell(page: Page, row: number, colId: string) {
  return page.locator('.ag-row').nth(row).locator(`.ag-cell[col-id="${colId}"]`);
}

test.describe('Calculated columns', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await gotoRoute(page);
  });

  test('computes declared calculated columns', async ({ page }) => {
    const profit0 = cell(page, 0, 'profit');
    const revenue = Number((await cell(page, 0, 'revenue').innerText()).replace(/[^0-9]/g, ''));
    const cost = Number((await cell(page, 0, 'cost').innerText()).replace(/[^0-9]/g, ''));
    await expect(profit0).toHaveText(String(revenue - cost));
    // Unit Price = revenue / units (IF guard keeps non-numeric from showing).
    await expect(cell(page, 0, 'unitPrice')).not.toHaveText(/^\s*$/);
  });

  test('builds and edits a calculated column through the expression palette', async ({ page }) => {
    await cell(page, 0, 'revenue').hover();
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await expect(page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' })).toBeVisible();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('tab', { name: 'Columns' })).toHaveAttribute('aria-selected', 'true');
    await dialog.getByRole('button', { name: /Insert \[revenue\]/ }).click();
    await dialog.getByRole('tab', { name: 'Operators' }).click();
    await dialog.getByRole('button', { name: /Insert \+: Addition/ }).click();
    // Drag is an enhancement; the same palette item remains a normal button.
    await dialog.getByRole('tab', { name: 'Columns' }).click();
    await dialog.getByRole('button', { name: /Insert \[revenue\]/ })
      .dragTo(dialog.locator('.lgr-calc-dialog-expression-gap[data-position="12"]'));
    await expect(dialog.locator('.lgr-calc-dialog-expression')).toHaveValue('[revenue] + [revenue]');
    await expect(cell(page, 0, 'lgr-calc-1')).toHaveText(
      String(Number((await cell(page, 0, 'revenue').innerText()).replace(/[^0-9]/g, '')) * 2),
    );
    await dialog.locator('.lgr-calc-dialog-close').click();
    await expect(dialog).toHaveCount(0);

    const calculatedHeader = page.locator('.ag-header-cell[col-id="lgr-calc-1"]');
    await calculatedHeader.hover();
    await calculatedHeader.locator('.ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Calculated Column' }).click();
    await page.locator('.lgr-menu-item', { hasText: 'Edit Calculated Column' }).click();
    await expect(dialog).toBeVisible();
    // Keyboard activation is available for every palette item as a button.
    await dialog.getByRole('tab', { name: 'Columns' }).click();
    const cost = dialog.getByRole('button', { name: /Insert \[cost\]/ });
    await cost.focus();
    await cost.press('Enter');
    await expect(dialog.locator('.lgr-calc-dialog-expression')).toHaveValue('[revenue] + [revenue][cost]');
    await dialog.locator('.lgr-calc-dialog-expression').fill('[revenue] - [cost]');
    await expect(cell(page, 0, 'lgr-calc-1')).toHaveText(
      String(
        Number((await cell(page, 0, 'revenue').innerText()).replace(/[^0-9]/g, ''))
        - Number((await cell(page, 0, 'cost').innerText()).replace(/[^0-9]/g, '')),
      ),
    );
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('uses pill-shaped drag feedback and empty dashed insertion targets', async ({ page }) => {
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    const item = dialog.getByRole('button', { name: /Insert \[revenue\]/ });
    await dialog.locator('.lgr-calc-dialog-expression').fill('[revenue][cost]');
    const gaps = dialog.locator('.lgr-calc-dialog-expression-gap');
    expect(await gaps.count()).toBe(3);
    expect(new Set(await gaps.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))).size).toBe(1);
    await item.evaluate((element) => {
      element.dispatchEvent(new DragEvent('dragstart', {
        bubbles: true,
        dataTransfer: new DataTransfer(),
      }));
    });

    await expect(item).toHaveClass(/lgr-calc-dialog-palette-item-dragging/);
    await expect(dialog.locator('.lgr-calc-dialog-expression-canvas')).toHaveAttribute('data-dragging', 'true');
    expect(await item.evaluate((element) => getComputedStyle(element).borderRadius)).toBe('999px');
    const gap = dialog.locator('.lgr-calc-dialog-expression-gap').first();
    await expect(gap).toHaveText('');
    expect(await gap.evaluate((element) => getComputedStyle(element).borderStyle)).toBe('dashed');
    expect(await gap.evaluate((element) => getComputedStyle(element).width)).toBe('28px');

    await item.evaluate((element) => element.dispatchEvent(new DragEvent('dragend', { bubbles: true })));
    await expect(dialog.locator('.lgr-calc-dialog-expression-canvas')).not.toHaveAttribute('data-dragging', 'true');
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('edits values inline on expression pills', async ({ page }) => {
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    const expression = dialog.locator('.lgr-calc-dialog-expression');
    await dialog.getByRole('tab', { name: 'Values' }).click();
    await dialog.getByRole('button', { name: /Insert Date:/ })
      .dragTo(dialog.locator('.lgr-calc-dialog-expression-gap[data-position="0"]'));
    const date = dialog.locator('.lgr-calc-dialog-expression-canvas').getByRole('textbox', { name: 'Edit date value' });
    await expect(date).toHaveAttribute('type', 'date');
    await date.fill('2026-08-20');
    await date.evaluate((element) => element.blur());
    await expect(expression).toHaveValue('"2026-08-20"');
    await dialog.getByRole('button', { name: /Edit date value/ }).click();
    await expect(dialog.locator('.lgr-calc-dialog-expression-canvas').getByRole('textbox', { name: 'Edit date value' })).toBeVisible();
    await dialog.locator('.lgr-calc-dialog-expression-canvas').getByRole('textbox', { name: 'Edit date value' })
      .evaluate((element) => element.blur());
    await dialog.getByRole('button', { name: /Insert Boolean:/ }).click();
    const bool = dialog.locator('.lgr-calc-dialog-expression-canvas').getByRole('combobox', { name: 'Edit boolean value' });
    await bool.selectOption('FALSE');
    await bool.evaluate((element) => element.blur());
    await expect(expression).toHaveValue('"2026-08-20"FALSE');
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('drops a palette formula token into the raw expression field without transfer JSON', async ({ page }) => {
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    const expression = dialog.locator('.lgr-calc-dialog-expression');
    await dialog.getByRole('button', { name: /Insert \[revenue\]/ }).dragTo(expression);
    await expect(expression).toHaveValue('[revenue]');
    await expect(expression).not.toHaveValue(/\{"label"/);
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('moves or removes expression pills through drag targets', async ({ page }) => {
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    const expression = dialog.locator('.lgr-calc-dialog-expression');
    await expression.fill('[revenue][cost]');
    await dialog.locator('.lgr-calc-dialog-expression-chip', { hasText: '[cost]' })
      .dragTo(dialog.locator('.lgr-calc-dialog-expression-gap[data-position="0"]'));
    await expect(expression).toHaveValue('[cost][revenue]');

    await dialog.locator('.lgr-calc-dialog-expression-chip', { hasText: '[revenue]' })
      .dragTo(dialog.locator('.lgr-calc-dialog-expression-trash-target'));
    await expect(expression).toHaveValue('[cost]');

    await expression.fill('[revenue][cost]');
    await dialog.locator('.lgr-calc-dialog-expression-chip', { hasText: '[cost]' })
      .dragTo(dialog.locator('.lgr-calc-dialog-palette'));
    await expect(expression).toHaveValue('[revenue]');
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('centers the responsive authoring modal', async ({ page }) => {
    const header = page.locator('.ag-header-cell[col-id="revenue"]');
    await header.hover();

    await header.locator('.ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();

    const dialog = page.locator('.lgr-calc-dialog');
    await expect(dialog).toBeVisible();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(Math.abs(dialogBox!.x + dialogBox!.width / 2 - 900)).toBeLessThanOrEqual(3);
    expect(Math.abs(dialogBox!.y + dialogBox!.height / 2 - 450)).toBeLessThanOrEqual(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dialog).toBeVisible();
    const narrowBox = await dialog.boundingBox();
    expect(narrowBox!.width).toBeLessThanOrEqual(382);
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('shows formula errors for invalid expressions', async ({ page }) => {
    await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();
    const dialog = page.locator('.lgr-calc-dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('.lgr-calc-dialog-expression').fill('[missing] + 1');
    await expect(cell(page, 0, 'lgr-calc-1')).toHaveText('#REF!');
    await dialog.locator('.lgr-calc-dialog-close').click();
  });

  test('logs calculated column events', async ({ page }) => {
    await expect(page.locator('.lgr-calc-log li').first()).toContainText('grid ready');
    await page.locator('.ag-header-cell[col-id="cost"] .ag-header-cell-menu-button').click();
    await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();
    await expect(page.locator('.lgr-calc-log').getByText('calculatedColumnCreated', { exact: false })).toBeVisible();
  });
});

test.describe('Calculated columns accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/calculated-columns');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }

      await page.locator('.ag-header-cell[col-id="revenue"] .ag-header-cell-menu-button').click();
      await page.locator('.lgr-menu-item', { hasText: 'Add Calculated Column' }).click();
      await expect(page.locator('.lgr-calc-dialog')).toBeVisible();
      await page.getByRole('tab', { name: 'Values' }).click();
      await page.getByRole('button', { name: /Insert Date:/ }).click();
      const results = await new AxeBuilder({ page }).include('.lgr-calc-dialog-overlay').analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
