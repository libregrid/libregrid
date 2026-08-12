import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Menus — Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menus');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('right-click a cell opens context menu with expected items', async ({ page }) => {
    const cell = page.locator('.ag-cell').first();
    await cell.click({ button: 'right' });

    const menu = page.locator('.lgr-context-menu');
    await expect(menu).toBeVisible();

    // Default items should be present
    await expect(menu.locator('.lgr-menu-item').first()).toBeVisible();
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
    await page.locator('h1').click();
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
