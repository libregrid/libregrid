import { test, expect } from '@playwright/test';

test.describe('Cookie consent', () => {
  test('gives the consent notice an accessible name', async ({ page }) => {
    await page.goto('/');

    const notice = page.locator('#klaro-cookie-notice');
    await expect(notice).toHaveAttribute('role', 'dialog');
    await expect(notice).toHaveAttribute('aria-label', 'Cookie preferences');
    await expect(notice).not.toHaveAttribute('aria-labelledby');
  });
});
