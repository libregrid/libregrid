import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Row Grouping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/row-grouping');
    await expect(page.locator('.ag-root-wrapper')).toBeVisible({ timeout: 15_000 });
  });

  test('group rows are displayed with aggregate values', async ({ page }) => {
    const rows = page.locator('.ag-row');
    await expect(rows.first()).toBeVisible();
    // groupDefaultExpanded: 1 → the five country groups show their city subgroups.
    expect(await rows.count()).toBeGreaterThan(5);
    // Aggregates land in the sales column (aggFunc: 'sum'). Expanded country
    // headers render blank: with groupTotalRow: 'bottom' the aggregate moves
    // onto the group's Total row (Community's displayIgnoresAggData), so
    // assert on a collapsed city group instead.
    const chicagoGroup = page.locator('.ag-row[row-id^="ROOT_NODE_ID"][row-id$="city-Chicago"]');
    await expect(chicagoGroup.locator('[col-id="sales"]')).not.toBeEmpty();
  });

  test('group rows expose aria-expanded reflecting groupDefaultExpanded', async ({ page }) => {
    const expandedRows = page.locator('.ag-row[aria-expanded="true"]');
    await expect(expandedRows.first()).toBeVisible();
    expect(await expandedRows.count()).toBe(5); // five country groups, each expanded

    const collapsedRows = page.locator('.ag-row[aria-expanded="false"]');
    expect(await collapsedRows.count()).toBeGreaterThan(0); // city subgroups stay collapsed
  });

  test('clicking the chevron expands a collapsed group', async ({ page }) => {
    const cityGroup = page.locator('.ag-row[row-id^="ROOT_NODE_ID"][row-id$="city-Chicago"]');
    await expect(cityGroup).toHaveAttribute('aria-expanded', 'false');
    expect(await page.locator('.ag-row-level-2').count()).toBe(0);

    await cityGroup.locator('.lgr-group-cell-toggle').click();

    await expect(cityGroup).toHaveAttribute('aria-expanded', 'true');
    // Chicago's three leaf rows appear, along with its group Total row.
    expect(await page.locator('.ag-row-level-2').count()).toBe(3);
    await expect(
      page.locator('.ag-row[row-id="rowGroupFooter_ROOT_NODE_ID-country-United States-city-Chicago"]'),
    ).toBeVisible();
  });

  test('total rows render at the bottom of expanded groups and at the grid end', async ({ page }) => {
    // groupTotalRow: 'bottom' → each expanded country group gets a footer.
    const usFooter = page.locator('.ag-row[row-id="rowGroupFooter_ROOT_NODE_ID-country-United States"]');
    await expect(usFooter.locator('.lgr-group-cell-total')).toHaveText('Total');
    // The footer's sales cell carries the group's aggregate.
    await expect(usFooter.locator('[col-id="sales"]')).not.toBeEmpty();

    // Rows are virtualized — scroll to the bottom to render the grand total.
    await page.locator('.ag-grid-viewport').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    // grandTotalRow: 'bottom' → the grand total is the grid's last row.
    const grandTotal = page.locator('.ag-row[row-id="rowGroupFooter_ROOT_NODE_ID"]');
    await expect(grandTotal.locator('.lgr-group-cell-total')).toHaveText('Total');
    await expect(grandTotal.locator('[col-id="sales"]')).not.toBeEmpty();
    await expect(page.locator('.ag-row').last()).toHaveAttribute('row-id', 'rowGroupFooter_ROOT_NODE_ID');
  });

  // Sticky group rows are not implemented (docs/parity/row-grouping.md
  // "Sticky rows" — Phase 3 territory), so there is nothing to pin while
  // scrolling yet. Deliberately skipped, not omitted.
  test.skip('sticky group row stays pinned while scrolling', async () => {});

  test('axe a11y violations light theme', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe a11y violations dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
