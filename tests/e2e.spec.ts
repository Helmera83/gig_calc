import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('save and export trip flow', async ({ page }) => {
  // Ensure inputs are present
  const paymentInput = page.locator('input#payment');
  const distanceInput = page.locator('input#distance');
  const gasInput = page.locator('input#gasPrice');
  const mpgInput = page.locator('input#mpg');
  const saveButton = page.getByRole('button', { name: /Save Trip Record/i });
  const exportButton = page.getByRole('button', { name: /Export Trip Data/i });

  await expect(paymentInput).toBeVisible();
  await paymentInput.fill('25.00');
  await distanceInput.fill('5.2');
  await gasInput.fill('3.50');
  await mpgInput.fill('25');

  // Save trip
  await saveButton.click();

  // Snackbar appears
  await expect(page.locator('text=Trip saved')).toBeVisible();

  // Open history modal using aria-label selector
  const historyButton = page.locator('button[aria-label="Open history"]');
  await expect(historyButton).toBeVisible();
  await historyButton.click();
  await expect(page.locator('text=Trip Ledger')).toBeVisible();

  // Export from modal - intercept download and verify CSV contents
  const downloadCsv = page.getByRole('button', { name: /Download CSV/i });
  await expect(downloadCsv).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadCsv.click(),
  ]);

  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const csv = await fs.readFile(downloadedPath!, 'utf8');

  // Basic CSV assertions
  expect(csv).toContain('payment');
  expect(csv).toContain('distance');
  expect(csv).toContain('25.00');
  expect(csv).toContain('5.2');

  // Ensure export action triggered (snackbar)
  await expect(page.locator('text=CSV downloaded')).toBeVisible();
});
