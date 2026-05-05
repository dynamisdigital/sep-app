import { expect, test } from '@playwright/test';

test('app sobe e responde no /', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/sep/i);
});
