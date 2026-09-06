import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** A package bar is the accordion toggle; its panel expands from the bottom of the bar. */
function barFor(page: Page, pkg: string) {
  return page.locator('.package').filter({ hasText: pkg });
}

/** The expanded panel is identified by a marker string unique to that package's detail content. */
function panelFor(page: Page, marker: string) {
  return page.locator('.detail').filter({ hasText: marker });
}

test.describe('API Reference package accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api');
    await expect(page.getByRole('heading', { name: /Choose, register, and operate/ })).toBeVisible();
  });

  test('starts with every package panel collapsed', async ({ page }) => {
    await expect(page.locator('.detail')).toHaveCount(0);
    const bars = page.locator('.package');
    const count = await bars.count();
    expect(count).toBeGreaterThan(30);
    for (let i = 0; i < count; i += 1) {
      await expect(bars.nth(i)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('expands the clicked package panel beneath its bar', async ({ page }) => {
    const bar = barFor(page, '@libregrid/row-grouping');
    await bar.click();
    const panel = panelFor(page, 'RowGroupingModule');
    await expect(panel).toBeVisible();
    // The panel belongs to the clicked bar's row, directly beneath the bar.
    await expect(bar.locator('xpath=ancestor::li').locator('.detail')).toHaveCount(1);
    await expect(bar).toHaveAttribute('aria-expanded', 'true');
    await expect(bar).toHaveClass(/is-selected/);
    await expect(panel).toHaveAttribute('role', 'region');
    await expect(panel).toContainText('Registered modules');
    await expect(panel).toContainText('Integration examples');
    // The bar button labels the panel region.
    await expect(panel).toHaveAttribute('aria-labelledby', await bar.getAttribute('id'));
  });

  test('keeps only one panel open at a time', async ({ page }) => {
    const grouping = barFor(page, '@libregrid/row-grouping');
    const notes = barFor(page, '@libregrid/notes');
    await grouping.click();
    await expect(panelFor(page, 'RowGroupingModule')).toBeVisible();
    await notes.click();
    await expect(panelFor(page, 'RowGroupingModule')).toHaveCount(0);
    await expect(panelFor(page, 'NotesModule')).toBeVisible();
    await expect(notes).toHaveAttribute('aria-expanded', 'true');
    await expect(grouping).toHaveAttribute('aria-expanded', 'false');
  });

  test('collapses the open panel when its bar is clicked again', async ({ page }) => {
    const notes = barFor(page, '@libregrid/notes');
    await notes.click();
    await expect(panelFor(page, 'NotesModule')).toBeVisible();
    await notes.click();
    await expect(page.locator('.detail')).toHaveCount(0);
    await expect(notes).toHaveAttribute('aria-expanded', 'false');
  });

  test('opens a panel with keyboard activation', async ({ page }) => {
    const bar = barFor(page, '@libregrid/sparklines');
    await bar.focus();
    await page.keyboard.press('Enter');
    await expect(panelFor(page, 'SparklineCellRenderer')).toBeVisible();
    await expect(bar).toHaveAttribute('aria-expanded', 'true');
  });

  test('removes the open panel when its row is filtered out and restores it after', async ({ page }) => {
    const bar = barFor(page, '@libregrid/row-grouping');
    await bar.click();
    await expect(panelFor(page, 'RowGroupingModule')).toBeVisible();
    await page.getByRole('searchbox', { name: /Search a customer job/ }).fill('durable selection');
    await expect(panelFor(page, 'RowGroupingModule')).toHaveCount(0);
    await page.getByRole('searchbox', { name: /Search a customer job/ }).fill('');
    await expect(panelFor(page, 'RowGroupingModule')).toBeVisible();
  });
});

test.describe('API Reference Accessibility', () => {
  for (const mode of ['light', 'dark'] as const) {
    test(`${mode} theme has no axe violations with a panel expanded`, async ({ page }) => {
      await page.goto('/api');
      await expect(page.locator('.package').first()).toBeVisible();
      await barFor(page, '@libregrid/row-grouping').click();
      await expect(panelFor(page, 'RowGroupingModule')).toBeVisible();
      if (mode === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
