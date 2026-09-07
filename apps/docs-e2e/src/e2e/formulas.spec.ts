import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function gotoRoute(page: Page): Promise<void> {
  await page.goto('/formulas');
  await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
}

function cell(page: Page, row: number, colId: string) {
  return page.locator('.ag-row').nth(row).locator(`.ag-cell[col-id="${colId}"]`);
}

test.describe('Formulas', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 });
    await gotoRoute(page);
  });

  test('evaluates data-supplied formulas, external-store formulas and custom functions', async ({ page }) => {
    const price = Number((await cell(page, 0, 'price').innerText()).replace(/[^0-9.]/g, ''));
    const quantity = Number((await cell(page, 0, 'quantity').innerText()).replace(/[^0-9]/g, ''));
    // Subtotal = B1*C1 (shorthand A1 formula in the row data).
    await expect(cell(page, 0, 'subtotal')).toHaveText(String(price * quantity));
    // Discount comes from the external formulaDataSource store (=C1 * 0.05).
    await expect(cell(page, 0, 'discount')).toHaveText(String(quantity * 0.05));
  });

  test('edits a formula through the tokenising editor with autocomplete', async ({ page }) => {
    await cell(page, 0, 'subtotal').dblclick();
    const editor = page.locator('.lgr-formula-editor');
    await expect(editor).toBeVisible();
    // Stored long-hand shows as shorthand A1.
    const input = editor.locator('.lgr-formula-input');
    await expect(input).toHaveValue(/=(B|C|D)\d+ \* (B|C|D)\d+/);
    // Autocomplete while typing a function name.
    await input.fill('=SU');
    await expect(editor.locator('.lgr-formula-suggestion').first()).toBeVisible();
    await input.press('Enter'); // accepts the first suggestion and opens the paren
    const value = await input.inputValue();
    expect(value).toMatch(/^=SUM\(\)$/);
    // Complete the formula and commit.
    await input.fill('=C1*2');
    await input.press('Enter');
    const quantity = Number((await cell(page, 0, 'quantity').innerText()).replace(/[^0-9]/g, ''));
    await expect(cell(page, 0, 'subtotal')).toHaveText(String(quantity * 2));
  });

  test('blocks invalid commits with live validation', async ({ page }) => {
    await cell(page, 0, 'subtotal').dblclick();
    const editor = page.locator('.lgr-formula-editor');
    const input = editor.locator('.lgr-formula-input');
    await input.fill('=C1 +');
    await expect(editor).toHaveClass(/lgr-formula-invalid/);
    await expect(editor.locator('.lgr-formula-status')).toContainText('#PARSE!');
    // Escape cancels without committing the invalid formula.
    await input.press('Escape');
    await expect(editor).toHaveCount(0);
    await expect(cell(page, 0, 'subtotal')).not.toHaveText('#PARSE!');
  });

  test('shows the formula error state for a broken formula', async ({ page }) => {
    await cell(page, 1, 'subtotal').dblclick();
    const input = page.locator('.lgr-formula-editor .lgr-formula-input');
    await input.fill('=ZZ99 * 2');
    await input.press('Enter');
    await expect(cell(page, 1, 'subtotal')).toHaveText('#REF!');
    // Community toggles the formula-error class on the cell element itself.
    await expect(cell(page, 1, 'subtotal')).toHaveClass(/formula-error/);
  });

  test('fills formulas with relative reference offsets', async ({ page }) => {
    // Fill the row-0 subtotal down one row: relative refs shift by one.
    const subtotal0 = cell(page, 0, 'subtotal');
    await subtotal0.hover();
    const handle = page.locator('.ag-selection-fill-handle, .ag-fill-handle').first();
    if (await handle.count()) {
      const box = await handle.boundingBox();
      const target = await cell(page, 1, 'subtotal').boundingBox();
      if (box && target) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
        await page.mouse.up();
        const price1 = Number((await cell(page, 1, 'price').innerText()).replace(/[^0-9.]/g, ''));
        const quantity1 = Number((await cell(page, 1, 'quantity').innerText()).replace(/[^0-9]/g, ''));
        await expect(cell(page, 1, 'subtotal')).toHaveText(String(price1 * quantity1));
      }
    }
  });

  test('passes axe light and dark', async ({ page }) => {
    const light = await new AxeBuilder({ page }).analyze();
    expect(light.violations).toEqual([]);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(250);
    const dark = await new AxeBuilder({ page }).analyze();
    expect(dark.violations).toEqual([]);
  });
});
