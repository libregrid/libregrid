import { expect, test } from '@playwright/test';

const GUIDED_ROUTES = [
  'grid', 'menus', 'side-bar', 'toolbar', 'row-grouping', 'pivot', 'columns', 'filters',
  'selection', 'excel-export', 'server-side', 'server-side-selection', 'viewport', 'tree-data',
  'calculated-columns', 'advanced-filter-find', 'batch-edit', 'row-numbers', 'column-header-edit',
  'notes',
] as const;

test.describe('shared feature-guide frame', () => {
  for (const route of GUIDED_ROUTES) {
    test(`${route} explains value, a task, setup, and production readiness`, async ({ page }) => {
      await page.goto(`/${route}`);
      await expect(page.locator('lgr-docs-feature-header')).toBeVisible();
      await expect(page.locator('lgr-docs-demo-guide')).toBeVisible();
      await expect(page.locator('lgr-docs-code-example').filter({ hasText: 'Add this capability to your application' })).toBeVisible();
      await expect(page.locator('lgr-docs-production-checklist')).toBeVisible();
    });
  }
});
