import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('theme switcher cycles through themes', async ({ page }) => {
  const themeSwitcher = page.locator('button').filter({ has: page.locator('span[data-icon="invert_colors"], span[data-icon="contrast"], span[data-icon="light_mode"]') }).first();

  // Wait for page to load
  await expect(page.locator('h1:text("GigCalc")')).toBeVisible();

  // Default theme should be dark
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/theme-high-contrast/);
  await expect(html).not.toHaveClass(/theme-light/);

  // Click to switch to high contrast
  await themeSwitcher.click();
  await page.waitForTimeout(300); // Wait for transition
  await expect(html).toHaveClass(/theme-high-contrast/);

  // Click to switch to light
  await themeSwitcher.click();
  await page.waitForTimeout(300);
  await expect(html).toHaveClass(/theme-light/);

  // Click to cycle back to dark
  await themeSwitcher.click();
  await page.waitForTimeout(300);
  await expect(html).not.toHaveClass(/theme-high-contrast/);
  await expect(html).not.toHaveClass(/theme-light/);

  console.log('✓ Theme switcher cycles correctly through all themes');
});

test('theme preference persists in localStorage', async ({ page }) => {
  const themeSwitcher = page.locator('button').filter({ has: page.locator('span[data-icon="invert_colors"], span[data-icon="contrast"], span[data-icon="light_mode"]') }).first();

  await expect(page.locator('h1:text("GigCalc")')).toBeVisible();

  // Switch to light theme
  await themeSwitcher.click();
  await themeSwitcher.click();
  await page.waitForTimeout(300);

  // Check localStorage
  const storedTheme = await page.evaluate(() => localStorage.getItem('gigCalcTheme'));
  expect(storedTheme).toBe('light');

  // Reload page
  await page.reload();
  await expect(page.locator('h1:text("GigCalc")')).toBeVisible();

  // Theme should still be light
  const html = page.locator('html');
  await expect(html).toHaveClass(/theme-light/);

  console.log('✓ Theme preference persists after page reload');
});

