import { test, expect, type Locator, type Page } from '@playwright/test';

const popup = (page: Page) => page.locator('.lgr-note-popup');

/**
 * Hover until the note popup is open. The popup opens after `noteShowDelay`
 * (180 ms); a re-rendered cell or a missed mouseover drops the pending show
 * timer, so re-hover on each retry — only a fresh hover restarts it.
 */
async function hoverOpenPopup(page: Page, target: Locator): Promise<void> {
  const p = popup(page);
  await target.hover();
  for (let attempt = 0; ; attempt++) {
    try {
      await expect(p).toBeVisible({ timeout: 2_500 });
      return;
    } catch {
      if (attempt >= 4) throw new Error('note popup did not open on hover');
      await target.hover();
    }
  }
}

test.describe('Cell Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notes');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('marks seeded noted cells and the full-width row', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    // Alice + Bruno name cells, plus the full-width Totals row.
    await expect(grid.locator('.lgr-cell-has-note')).toHaveCount(3);
    await expect(grid.locator('.ag-full-width-row.lgr-cell-has-note')).toHaveCount(1);
  });

  test('hovering a noted cell opens the note popup with the stored text', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    const aliceName = grid.locator('.ag-row').nth(0).locator('.ag-cell[col-id="name"]');
    await hoverOpenPopup(page, aliceName);
    const p = popup(page);
    await expect(p.locator('.lgr-note-popup-title')).toHaveText('Ada');
    // The editable note renders a textarea; its text lives in the value.
    await expect(p.locator('.lgr-note-popup-text')).toHaveValue(/sabbatical/);
  });

  test('editing the note and closing commits the change', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    const aliceName = grid.locator('.ag-row').nth(0).locator('.ag-cell[col-id="name"]');
    await hoverOpenPopup(page, aliceName);
    const p = popup(page);

    await p.locator('.lgr-note-popup-text').fill('Updated from e2e.');
    await p.locator('.lgr-note-popup-close').click();
    await expect(p).toBeHidden();

    await hoverOpenPopup(page, aliceName);
    await expect(p.locator('.lgr-note-popup-text')).toHaveValue('Updated from e2e.');
  });

  test('noteTrigger: click disables hover and opens on click', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    await page.getByRole('button', { name: 'noteTrigger: hover' }).click();
    await expect(page.getByRole('button', { name: 'noteTrigger: click' })).toBeVisible();

    const aliceName = grid.locator('.ag-row').nth(0).locator('.ag-cell[col-id="name"]');
    const p = popup(page);
    await aliceName.hover();
    // Longer than the hover show delay (180ms): no popup in click mode.
    await page.waitForTimeout(600);
    await expect(p).toBeHidden();

    await aliceName.click();
    await expect(p).toBeVisible();
  });

  test('read-only notes open without an editor or a remove button', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    const brunoName = grid.locator('.ag-row').nth(1).locator('.ag-cell[col-id="name"]');
    await hoverOpenPopup(page, brunoName);
    const p = popup(page);
    // Read-only notes render a read-only div (not a textarea).
    await expect(p.locator('.lgr-note-popup-text')).toHaveText(/HR approval/);
    await expect(p.locator('textarea')).toHaveCount(0);
    await expect(p.locator('[aria-readonly="true"]')).toHaveCount(1);
    await expect(p.locator('.lgr-note-popup-remove')).toHaveCount(0);
  });

  test('clear all notes removes markers, add note restores one', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    await page.getByRole('button', { name: 'Clear all notes' }).click();
    await expect(grid.locator('.lgr-cell-has-note')).toHaveCount(0);

    await page.getByRole('button', { name: 'Add note to first row' }).click();
    await expect(grid.locator('.ag-row').nth(0).locator('.ag-cell[col-id="name"]')).toHaveClass(
      /lgr-cell-has-note/,
    );
  });

  test('the full-width row note opens on hover', async ({ page }) => {
    const grid = page.getByTestId('notes-grid');
    await hoverOpenPopup(page, grid.locator('.ag-full-width-row'));
    const p = popup(page);
    await expect(p.locator('.lgr-note-popup-text')).toHaveValue(/notes work here too/);
  });
});
