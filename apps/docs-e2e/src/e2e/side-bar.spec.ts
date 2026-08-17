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

  test('open columns panel shows content', async ({ page }) => {
    await page.getByRole('button', { name: 'Open columns panel' }).click();

    const panel = page.locator('.lgr-columns-tool-panel');
    await expect(panel).toBeVisible();
  });

  test('close panel removes content', async ({ page }) => {
    await expect(page.locator('.lgr-columns-tool-panel')).toBeVisible();

    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('.lgr-columns-tool-panel')).not.toBeVisible();
  });

  test('state shows openPanel=columns after opening', async ({ page }) => {
    await page.getByRole('button', { name: 'Open columns panel' }).click();
    await expect(page.locator('text=openPanel=columns')).toBeVisible();
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
    await page.getByRole('button', { name: 'Left', exact: true }).click();

    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toHaveClass(/lgr-side-bar-left/);

    // The whole bar sits to the LEFT of the grid body viewport.
    const barBox = await sideBar.boundingBox();
    const gridBox = await page
      .getByTestId('side-bar-grid')
      .locator('.ag-grid-viewport')
      .boundingBox();
    expect(barBox).not.toBeNull();
    expect(gridBox).not.toBeNull();
    expect(barBox!.x + barBox!.width).toBeLessThanOrEqual(gridBox!.x + 1);

    // The open panel extends inward (rightward) from the bar over the grid.
    const panelBox = await page.locator('.lgr-side-bar-panel').boundingBox();
    expect(panelBox!.x).toBeGreaterThanOrEqual(barBox!.x + barBox!.width - 1);

    // The vertical scrollbar is NOT pinned to the old right-side position:
    // it stays at the grid's right edge, uncovered by the left-side panel.
    const verticalBox = await page
      .getByTestId('side-bar-grid')
      .locator('.ag-body-vertical-scroll')
      .boundingBox();
    expect(verticalBox!.x + verticalBox!.width).toBeGreaterThanOrEqual(
      gridBox!.x + gridBox!.width - 1,
    );
  });

  test('switching back to right position restores class', async ({ page }) => {
    await page.getByRole('button', { name: 'Left', exact: true }).click();
    await expect(page.locator('.lgr-side-bar')).toHaveClass(/lgr-side-bar-left/);

    await page.getByRole('button', { name: 'Right', exact: true }).click();
    const sideBar = page.locator('.lgr-side-bar');
    await expect(sideBar).toHaveClass(/lgr-side-bar-right/);

    // The whole bar returns to the RIGHT of the grid body, with the button
    // strip back on the inner edge (left of the panel).
    const barBox = await sideBar.boundingBox();
    const gridBox = await page
      .getByTestId('side-bar-grid')
      .locator('.ag-grid-viewport')
      .boundingBox();
    expect(barBox!.x).toBeGreaterThanOrEqual(gridBox!.x + gridBox!.width - 1);
    // The open panel extends inward (leftward) from the bar over the grid.
    const panelBox = await page.locator('.lgr-side-bar-panel').boundingBox();
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(barBox!.x + 1);
  });

  test('side bar panel has tablist and tabpanel roles', async ({ page }) => {
    await expect(page.locator('.lgr-side-bar-buttons')).toHaveAttribute('role', 'tablist');
    await expect(page.locator('.lgr-side-bar-panel')).toHaveAttribute('role', 'tabpanel');
  });

  test('active panel button exposes aria-expanded', async ({ page }) => {
    const panelButton = page.getByRole('tab', { name: 'Columns' });
    await expect(panelButton).toHaveAttribute('aria-expanded', 'true');

    await panelButton.click();
    await expect(panelButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('opening and closing a panel does not change the grid footprint', async ({ page }) => {
    const grid = page.getByTestId('side-bar-grid').locator('.ag-root-wrapper');
    const sideBar = page.locator('.lgr-side-bar');
    const barBox = await sideBar.boundingBox();
    expect(barBox).not.toBeNull();
    // The bar is the constant 32px strip — no empty panel placeholder.
    expect(barBox!.width).toBeLessThanOrEqual(34);

    const closedBox = await grid.boundingBox();
    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('.lgr-columns-tool-panel')).not.toBeVisible();
    // Closed: bar stays the strip, grid width unchanged.
    const closedBarBox = await sideBar.boundingBox();
    expect(closedBarBox!.width).toBe(barBox!.width);
    const closedGridBox = await grid.boundingBox();
    expect(closedGridBox!.width).toBe(closedBox!.width);

    // Open a panel: it overlays the grid inward; the grid width is untouched.
    await page.getByRole('button', { name: 'Open filters panel' }).click();
    await expect(page.locator('.lgr-filter-panel')).toBeVisible();
    const openGridBox = await grid.boundingBox();
    expect(openGridBox!.width).toBe(closedBox!.width);
    const panelBox = await page.locator('.lgr-side-bar-panel').boundingBox();
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(barBox!.x + 1);
    // Re-open the columns panel for the remaining tests.
    await page.getByRole('button', { name: 'Open columns panel' }).click();
  });

  test('grid scroll range accounts for the open panel overlay', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/side-bar');
    await expect(page.getByTestId('side-bar-grid')).toBeVisible({ timeout: 15_000 });

    const viewport = page.getByTestId('side-bar-grid').locator('.ag-grid-viewport');
    const firstCell = page.getByTestId('side-bar-grid').locator('[col-id="country"]').first();
    const lastCell = page.getByTestId('side-bar-grid').locator('[col-id="stock"]').first();
    const verticalBar = page.getByTestId('side-bar-grid').locator('.ag-body-vertical-scroll');
    const horizontalBar = page.getByTestId('side-bar-grid').locator('.ag-body-horizontal-scroll');

    // Closed: baseline geometry.
    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('.lgr-columns-tool-panel')).not.toBeVisible();
    const closedBox = await viewport.boundingBox();
    const firstX = (await firstCell.boundingBox())!.x;
    const closedScrollWidth = await viewport.evaluate((el) => el.scrollWidth);

    // Open: the panel overlays the columns. The columns neither move nor
    // re-layout (first AND last cell keep their positions), while the
    // viewport narrows so the grid's own scroll math accounts for the panel.
    await page.getByRole('button', { name: 'Open columns panel' }).click();
    await expect(page.locator('.lgr-columns-tool-panel')).toBeVisible();
    const panelBox = await page.locator('.lgr-side-bar-panel').boundingBox();
    const inset = Math.round(panelBox!.width);
    const openBox = await viewport.boundingBox();
    expect(openBox!.width).toBeLessThanOrEqual(closedBox!.width - inset + 1);
    expect((await firstCell.boundingBox())!.x).toBe(firstX);
    // No re-layout: the content keeps its full width — only the visible
    // window narrowed, which is what makes the grid's scrollbar appear.
    expect(await viewport.evaluate((el) => el.scrollWidth)).toBe(closedScrollWidth);

    // Both scrollbars stay visible beside the panel, and the horizontal
    // scrollbar has a working thumb.
    const verticalBox = await verticalBar.boundingBox();
    expect(verticalBox).not.toBeNull();
    expect(verticalBox!.x + verticalBox!.width).toBeLessThanOrEqual(panelBox!.x + 1);
    const horizontalBox = await horizontalBar.boundingBox();
    expect(horizontalBox).not.toBeNull();
    expect(horizontalBox!.x + horizontalBox!.width).toBeLessThanOrEqual(panelBox!.x + 1);
    expect(horizontalBox!.height).toBeGreaterThan(0);
    const thumb = horizontalBar.locator('.ag-body-horizontal-scroll-container');
    const thumbBox = await thumb.boundingBox();
    expect(thumbBox!.width).toBeGreaterThan(0);

    // Scrub fully right: the last column clears the panel (scrolling moves
    // it — the grid content itself never re-laid out when the panel opened).
    await viewport.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const lastBox = await lastCell.boundingBox();
    expect(lastBox).not.toBeNull();
    expect(lastBox!.x + lastBox!.width).toBeLessThanOrEqual(panelBox!.x + 1);

    // Scroll back so later tests start at the natural position.
    await viewport.evaluate((el) => {
      el.scrollLeft = 0;
    });
  });

  test('dragging the resize handle respects configured bounds', async ({ page }) => {
    const panel = page.locator('.lgr-side-bar-panel');
    const handle = page.locator('.lgr-side-bar-resize-handle');
    await expect(panel).toHaveCSS('width', '260px');

    let handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + 3, handleBox!.y + 100);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x - 500, handleBox!.y + 100);
    await page.mouse.up();
    await expect(panel).toHaveCSS('width', '380px');

    handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + 3, handleBox!.y + 100);
    await page.mouse.down();
    // Stay within the viewport: Firefox drops mouse-move coordinates that
    // land outside it, unlike Chromium/WebKit, which tolerate overflow.
    // The +3px grab offset makes the effective delta 147px: 380 - 147 = 233.
    await page.mouse.move(handleBox!.x + 150, handleBox!.y + 100);
    await page.mouse.up();
    await expect(panel).toHaveCSS('width', '233px');
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
