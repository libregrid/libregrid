import { test, expect } from '@playwright/test';

const EDITOR = '.lgr-header-name-editor-input';
const ROOT_COLUMN_MENU_ITEMS = '.lgr-column-menu > .lgr-menu-scroll .lgr-menu-item';

async function openColumnMenu(page: import('@playwright/test').Page, colId: string): Promise<void> {
  await page.locator(`.ag-header-cell[col-id="${colId}"] .ag-header-cell-menu-button`).click();
  await expect(page.locator('.lgr-column-menu')).toBeVisible();
}

test.describe('Column Header Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/column-header-edit');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('offers Edit Column Name only for headerNameEditable columns', async ({ page }) => {
    await openColumnMenu(page, 'name');
    const menu = page.locator('.lgr-column-menu');
    await expect(page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();

    await openColumnMenu(page, 'notes');
    await expect(page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  test('renames a column live: Enter commits, the name persists in column state', async ({ page }) => {
    const grid = page.getByTestId('column-header-edit-grid');
    await openColumnMenu(page, 'name');
    await page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' }).click();

    const input = page.locator(EDITOR);
    await expect(input).toBeVisible();
    await input.fill('Full Name');
    await input.press('Enter');
    await expect(input).not.toBeVisible();

    await expect(grid.locator('.ag-header-cell[col-id="name"]')).toContainText('Full Name');
    // Still the override after re-rendering: reopening the editor shows the new name.
    await openColumnMenu(page, 'name');
    await page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' }).click();
    await expect(page.locator(EDITOR)).toHaveValue('Full Name');
    await page.keyboard.press('Escape');

    // resetColumnState() reverts to the definition name.
    await page.getByRole('button', { name: 'resetColumnState()' }).click();
    await expect(grid.locator('.ag-header-cell[col-id="name"]')).toContainText('Name');
  });

  test('Escape in live mode discards the edit', async ({ page }) => {
    const grid = page.getByTestId('column-header-edit-grid');
    await openColumnMenu(page, 'name');
    await page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' }).click();

    const input = page.locator(EDITOR);
    await input.fill('Discarded');
    await input.press('Escape');

    await expect(grid.locator('.ag-header-cell[col-id="name"]')).toContainText('Name');
  });

  test('defers the edit in deferred mode: Apply commits, Escape discards', async ({ page }) => {
    const grid = page.getByTestId('column-header-edit-grid');
    await page.getByRole('button', { name: "applyMode: 'live'" }).click();
    await expect(page.getByRole('button', { name: "applyMode: 'deferred'" })).toBeVisible();

    await openColumnMenu(page, 'name');
    await page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' }).click();
    const input = page.locator(EDITOR);
    await input.fill('Committed');
    await page.locator('.lgr-header-name-editor-apply').click();
    await expect(grid.locator('.ag-header-cell[col-id="name"]')).toContainText('Committed');

    await openColumnMenu(page, 'name');
    await page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' }).click();
    await input.fill('Thrown away');
    await input.press('Escape');
    await expect(grid.locator('.ag-header-cell[col-id="name"]')).toContainText('Committed');
  });

  test('renames an editable column group header', async ({ page }) => {
    const grid = page.getByTestId('column-header-edit-grid');
    // v36 renders no menu button on group headers, so the group menu opens
    // from the group-header context menu (Community routes the right-click
    // through the menu factory with the AgProvidedColumnGroup as target).
    // Community renders the group header's `col-id` as `<groupId>_0`.
    const groupCell = grid.locator('.ag-header-group-cell[col-id="where_0"]');
    await expect(groupCell).toHaveCount(1);
    await groupCell.click({ button: 'right' });
    const menu = page.locator('.lgr-column-menu');
    await expect(menu).toBeVisible();
    // Per-column items (sort, auto-size this column, ...) are hidden for a
    // group target; the group-capable Edit Column Name item is offered.
    await expect(page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' })).toBeVisible();
    await expect(page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Sort Ascending' })).toHaveCount(0);

    await page.locator(ROOT_COLUMN_MENU_ITEMS, { hasText: 'Edit Column Name' }).click();

    const input = page.locator(EDITOR);
    await expect(input).toBeVisible();
    await input.fill('Region & Sales');
    await input.press('Enter');

    await expect(groupCell).toContainText('Region & Sales');
  });
});
