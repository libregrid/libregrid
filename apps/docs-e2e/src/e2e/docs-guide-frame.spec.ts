import { expect, test } from '@playwright/test';

/**
 * Every route with a `ROUTE_GUIDES` entry renders its guide frame through
 * `<lgr-docs-feature-page>`.
 */
const FRAMED_ROUTES = [
  'advanced-filter-find',
  'angular',
  'batch-edit',
  'calculated-columns',
  'column-header-edit',
  'columns',
  'excel-export',
  'filters',
  'grid',
  'menus',
  'notes',
  'pivot',
  'row-grouping',
  'row-numbers',
  'selection',
  'server-side',
  'server-side-selection',
  'side-bar',
  'sparklines',
  'toolbar',
  'tree-data',
  'viewport',
] as const;

test.describe('feature page frame', () => {
  for (const route of FRAMED_ROUTES) {
    test(`${route} renders one header, a task guide, and setup examples`, async ({ page }) => {
      await page.goto(`/${route}`);
      await expect(page.locator('lgr-docs-feature-header')).toBeVisible();
      await expect(page.locator('lgr-docs-demo-guide')).toBeVisible();
      await expect(
        page.locator('lgr-docs-code-example').filter({ hasText: 'Add this capability to your application' }),
      ).toBeVisible();
      // The title appears exactly once; the route's own h1 is gone.
      await expect(page.locator('h1')).toHaveCount(1);
    });
  }

  test('row-grouping has no generic production checklist', async ({ page }) => {
    await page.goto('/row-grouping');
    // The guide defines no route-specific checklist, so none is rendered.
    await expect(page.locator('lgr-docs-production-checklist')).toHaveCount(0);
  });
});
