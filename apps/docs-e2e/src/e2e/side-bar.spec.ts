import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Side Bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/side-bar');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('side bar is visible by default with configured panel', async ({ page }) => {
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toBeVisible();
  });

  test('toggle side bar hides it', async ({ page }) => {
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toBeVisible();

    await page.getByRole('button', { name: 'Toggle side bar' }).click();
    await expect(sideBar).not.toBeVisible();

    // State text updates
    await expect(page.locator('text=visible=false')).toBeVisible();
  });

  test('toggle side bar twice restores visibility', async ({ page }) => {
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toBeVisible();

    await page.getByRole('button', { name: 'Toggle side bar' }).click();
    await expect(sideBar).not.toBeVisible();

    await page.getByRole('button', { name: 'Toggle side bar' }).click();
    await expect(sideBar).toBeVisible();
  });

  test('open stub panel shows content', async ({ page }) => {
    await page.getByRole('button', { name: 'Open stub panel' }).click();

    const panel = page.locator('.lgr-tool-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.lgr-tool-panel-header')).toHaveText('Stub Panel');
  });

  test('close panel removes content', async ({ page }) => {
    await page.getByRole('button', { name: 'Open stub panel' }).click();
    await expect(page.locator('.lgr-tool-panel')).toBeVisible();

    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('.lgr-tool-panel')).not.toBeVisible();
  });

  test('state shows openPanel=stub after opening', async ({ page }) => {
    await page.getByRole('button', { name: 'Open stub panel' }).click();
    await expect(page.locator('text=openPanel=stub')).toBeVisible();
  });

  test('side bar has role=complementary', async ({ page }) => {
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toHaveAttribute('role', 'complementary');
  });

  test('side bar has aria-label', async ({ page }) => {
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toHaveAttribute('aria-label', 'Side bar');
  });

  test('position right is default', async ({ page }) => {
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toHaveClass(/lgr-side-bar-right/);
  });

  test('switching to left position applies correct class', async ({ page }) => {
    await page.getByRole('button', { name: 'Left' }).click();

    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toHaveClass(/lgr-side-bar-left/);
  });

  test('switching back to right position restores class', async ({ page }) => {
    await page.getByRole('button', { name: 'Left' }).click();
    await expect(page.locator('.lgr-side-bar')).toHaveClass(/lgr-side-bar-left/);

    await page.getByRole('button', { name: 'Right' }).click();
    await expect(page.locator('.lgr-side-bar')).toHaveClass(/lgr-side-bar-right/);
  });

  test('side bar panel has tablist and tabpanel roles', async ({ page }) => {
    await expect(page.locator('.lgr-side-bar-buttons')).toHaveAttribute('role', 'tablist');
    await expect(page.locator('.lgr-side-bar-panel')).toHaveAttribute('role', 'tabpanel');
  });

  test('active panel button exposes aria-expanded', async ({ page }) => {
    const panelButton = page.getByRole('tab', { name: 'Stub Panel' });
    await expect(panelButton).toHaveAttribute('aria-expanded', 'true');

    await panelButton.click();
    await expect(panelButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('dragging the resize handle respects configured bounds', async ({ page }) => {
    const panel = page.locator('.lgr-side-bar-panel');
    const handle = page.locator('.lgr-side-bar-resize-handle');
    await expect(panel).toHaveCSS('width', '200px');

    let handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + 3, handleBox!.y + 100);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x - 500, handleBox!.y + 100);
    await page.mouse.up();
    await expect(panel).toHaveCSS('width', '280px');

    handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + 3, handleBox!.y + 100);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 500, handleBox!.y + 100);
    await page.mouse.up();
    await expect(panel).toHaveCSS('width', '160px');
  });

  test('hideButtons hides side-bar panel controls', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide panel buttons' }).click();
    await expect(page.locator('.lgr-side-bar-buttons')).not.toBeVisible();

    await page.getByRole('button', { name: 'Show panel buttons' }).click();
    await expect(page.locator('.lgr-side-bar-buttons')).toBeVisible();
  });
});

test.describe('Side bar accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations`, async ({ page }) => {
      await page.goto('/side-bar');
      await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
      if (mode === 'dark') {
        await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      }

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
