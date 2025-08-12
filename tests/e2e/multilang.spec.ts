import { test, expect } from '@playwright/test';

const appUrl = '/?testMode=1';

test('French low-value payment executes without confirmation', async ({ page }) => {
  await page.goto(appUrl);

  await page.getByTestId('command-input').fill('Payer 40 euros à Bob');
  await page.getByTestId('process-command').click();

  await expect(page.locator('.confirmation-card')).toHaveCount(0);
  await expect(page.locator('.card')).toContainText(/Showing|Successfully sent|Balance|transactions|processed/i);
});

test('Spanish low-value payment executes without confirmation', async ({ page }) => {
  await page.goto(appUrl);

  await page.getByTestId('command-input').fill('Pagar 30 a David');
  await page.getByTestId('process-command').click();

  await expect(page.locator('.confirmation-card')).toHaveCount(0);
  await expect(page.locator('.card')).toContainText(/Successfully sent|Command executed|processed/i);
});