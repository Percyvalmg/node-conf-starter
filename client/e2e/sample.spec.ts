import { test, expect } from '@playwright/test';

test('app loads and renders the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Squad Assembly')).toBeVisible();
});
