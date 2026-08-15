import { expect, test } from '@playwright/test';

test.describe('Docs grid layout', () => {
  test('does not clip a grid edge or its built-in scrollbars', async ({ page }) => {
    await page.goto('/grid');
    const host = page.locator('.lgr-grid-host');
    await expect(host).toBeVisible();
    await expect(host).not.toHaveCSS('overflow', 'hidden');
    await expect(page.locator('.lgr-side-bar.ag-invisible')).toHaveCSS('display', 'none');
    const unusedRightWidth = await page.locator('.ag-root-wrapper').evaluate((root) => {
      const body = root.querySelector('.ag-root');
      return body
        ? root.clientWidth - body.getBoundingClientRect().width
        : Number.POSITIVE_INFINITY;
    });
    expect(unusedRightWidth).toBeLessThanOrEqual(2);
  });
});
