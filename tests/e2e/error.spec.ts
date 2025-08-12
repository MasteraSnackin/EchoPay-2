import { test, expect } from '@playwright/test';

const appUrl = '/?testMode=1';

test('Adding duplicate contact shows friendly error', async ({ page }) => {
  await page.goto(appUrl);

  // First add
  await page.getByTestId('command-input').fill('Ajouter le contact Isabelle');
  await page.getByTestId('process-command').click();
  await expect(page.locator('.card')).toContainText(/added successfully|success/i);

  // Try to add again
  await page.getByTestId('command-input').fill('Ajouter le contact Isabelle');
  await page.getByTestId('process-command').click();

  await expect(page.locator('.card')).toContainText(/already exists|error|unable/i);
});