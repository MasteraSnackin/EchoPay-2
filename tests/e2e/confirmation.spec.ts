import { test, expect } from '@playwright/test';

const appUrl = '/?testMode=1';

test('High-value payment requires confirmation and executes on Yes', async ({ page }) => {
  await page.goto(appUrl);

  // Type command
  await page.getByTestId('command-input').fill('Pay 1000 to Alice');
  await page.getByTestId('process-command').click();

  // Expect confirmation UI
  const confirmCard = page.locator('.confirmation-card');
  await expect(confirmCard).toBeVisible();
  await expect(confirmCard).toContainText('Pay 1000');

  // Confirm
  await page.getByTestId('confirm-yes').click();

  // Expect success message in response area
  await expect(page.locator('.status-area, .card')).toContainText(/success|Successfully sent|Command confirmed/i);
});