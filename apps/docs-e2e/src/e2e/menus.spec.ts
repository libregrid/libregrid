import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROOT_CONTEXT_MENU_ITEMS = '.lgr-context-menu > .lgr-menu-scroll .lgr-menu-item';

test.describe('Menus — Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menus');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('right-click a cell opens context menu with expected items', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });
    const cellBox = await cell.boundingBox();

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    // A traditional popup: anchored at the click, not stretched over the grid.
    const menuBox = await menu.boundingBox();
    const gridBox = await page.getByTestId('menus-grid').boundingBox();
    expect(menuBox!.width).toBeLessThan(gridBox!.width / 2);
    expect(menuBox!.x).toBeLessThanOrEqual(cellBox!.x + cellBox!.width + 1);
    expect(menuBox!.y).toBeGreaterThanOrEqual(cellBox!.y - 1);

    // Default items should be present
    await expect(page.locator(ROOT_CONTEXT_MENU_ITEMS).first()).toBeVisible();
  });

  test('separators span the full menu width', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    // One part per option column (icon/name/shortcut/arrow), so the combined
    // border line spans the whole row instead of just the icon column.
    const separator = menu.locator('.lgr-menu-separator').first();
    await expect(separator.locator('.lgr-menu-separator-part')).toHaveCount(4);
    const menuBox = await menu.boundingBox();
    const sepBox = await separator.boundingBox();
    expect(sepBox!.width).toBeGreaterThan(menuBox!.width * 0.9);
  });

  test('Export opens a submenu; a child click runs the item and closes the menu', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    const exportRow = page.locator(ROOT_CONTEXT_MENU_ITEMS, { hasText: /^Export/ });
    await exportRow.hover();
    const submenu = page.locator('.lgr-sub-menu');
    await expect(submenu).toBeVisible();
    await expect(menu).toHaveCount(1);
    await expect(submenu.locator('.lgr-menu-item', { hasText: 'CSV Export' })).toBeVisible();
    await expect(submenu.locator('.lgr-menu-item', { hasText: 'Excel Export' })).toBeVisible();

    // The parent row stays highlighted while its submenu is open.
    await expect(exportRow).toHaveClass(/lgr-menu-item-submenu-open/);

    // Selecting a child item closes the whole menu (the CSV export runs as a
    // download, which the e2e runner accepts and discards).
    await submenu.locator('.lgr-menu-item', { hasText: 'CSV Export' }).click();
    await expect(menu).not.toBeVisible();
  });

  test('keyboard: ArrowRight opens the Export submenu; ArrowLeft returns to the parent', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();
    await expect(page.locator(`${ROOT_CONTEXT_MENU_ITEMS}:not(.lgr-menu-item-disabled)`).first()).toBeFocused();

    // Walk down to the Export item (order varies with registered modules).
    for (let i = 0; i < 10; i++) {
      const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
      if (focused.startsWith('Export')) break;
      await page.keyboard.press('ArrowDown');
    }
    await expect(page.locator(ROOT_CONTEXT_MENU_ITEMS, { hasText: /^Export/ })).toBeFocused();

    await page.keyboard.press('ArrowRight');
    const submenu = page.locator('.lgr-sub-menu');
    await expect(submenu).toBeVisible();
    await expect(submenu.locator('.lgr-menu-item').first()).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(submenu.locator('.lgr-menu-item').nth(1)).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(submenu).toHaveCount(0);
    await expect(page.locator(ROOT_CONTEXT_MENU_ITEMS, { hasText: /^Export/ })).toBeFocused();
  });

  test('a menu opened at the grid edge renders outside the grid footprint', async ({ page }) => {
    const grid = page.getByTestId('menus-grid');
    const gridBox = await grid.boundingBox();

    // Right-click the cell in the last column — the menu would previously be
    // clamped (and with small grids, clipped) inside the grid rectangle.
    const cell = grid.locator('.ag-row').first().locator('.ag-cell').last();
    await cell.click({ button: 'right' });

    const menu = page.locator('.ag-popup-child.lgr-context-menu');
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();

    // The menu extends past the grid's right edge…
    expect(menuBox!.x + menuBox!.width).toBeGreaterThan(gridBox!.x + gridBox!.width);
    // …but never past the viewport: it is viewport-clamped, not clipped.
    const viewport = page.viewportSize()!;
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  test('Escape closes the context menu', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  });

  test('menu has role=menu and items have role=menuitem', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toHaveAttribute('role', 'menu');

    const items = menu.locator('[role="menuitem"]');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('ArrowDown moves focus to next menu item', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    // Focus first item
    const items = menu.locator('.lgr-menu-item:not(.lgr-menu-item-disabled)');
    await items.first().focus();

    await page.keyboard.press('ArrowDown');
    const secondItem = items.nth(1);
    await expect(secondItem).toBeFocused();
  });

  test('Enter activates focused menu item', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    const items = menu.locator('.lgr-menu-item:not(.lgr-menu-item-disabled)');
    await items.first().focus();

    await page.keyboard.press('Enter');
    // Menu should close after action fires
    await expect(menu).not.toBeVisible();
  });

  test('clicking a menu item closes the menu', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    const item = menu.locator('.lgr-menu-item:not(.lgr-menu-item-disabled)').first();
    await item.click();
    await expect(menu).not.toBeVisible();
  });

  test('clicking outside closes the menu', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    // Click on the page title (outside the menu)
    await page.getByRole('heading', { name: 'Menus', exact: true }).first().click();
    await expect(menu).not.toBeVisible();
  });

  test('Ctrl-click opens the menu when explicitly allowed', async ({ page }) => {
    await page.locator('.ag-cell').first().click({ button: 'right', modifiers: ['Control'] });
    await expect(page.locator('.lgr-context-menu')).toBeVisible();
  });

  test('suppressContextMenu prevents the LibreGrid popup', async ({ page }) => {
    await page.getByRole('button', { name: 'Suppress context menu' }).click();
    await page.locator('.ag-cell').first().click({ button: 'right' });
    await expect(page.locator('.lgr-context-menu')).not.toBeVisible();
  });

  test('focus returns to the trigger after Escape', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.focus();
    await cell.click({ button: 'right' });
    await expect(page.locator('.lgr-context-menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(cell).toBeFocused();
  });
});

test.describe('Menus — Column Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menus');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('API: showContextMenu opens menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Show context menu' }).click();

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();
  });

  test('API: hidePopupMenu closes menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Show context menu' }).click();
    await expect(page.locator('.lgr-context-menu')).toBeVisible();

    await page.getByRole('button', { name: 'Hide popup menu' }).click();
    await expect(page.locator('.lgr-context-menu')).not.toBeVisible();
  });

  test('header menu button opens the column menu', async ({ page }) => {
    const header = page.getByRole('columnheader', { name: 'Country' });
    const menuButton = header.locator('.ag-header-cell-menu-button');
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    await expect(page.locator('.lgr-column-menu')).toBeVisible();
  });

  test('header right-click opens the column menu', async ({ page }) => {
    await page.getByRole('columnheader', { name: 'Country' }).click({ button: 'right' });
    await expect(page.locator('.lgr-column-menu')).toBeVisible();
  });

});

test.describe('Menus accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/menus');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
