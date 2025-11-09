import { test, expect } from '@playwright/test';

test.describe('User Creation and Registration', () => {
  test.beforeEach(async ({ context }) => {
    // Clear storage before each test
    await context.clearCookies();
  });

  test('should load the app and create a new user automatically', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check that the page loaded
    await expect(page).toHaveTitle(/Bamboozled/i);

    // The app should automatically create a user and store userId in localStorage
    const userId = await page.evaluate(() => localStorage.getItem('userId'));
    expect(userId).toBeTruthy();
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('should display user info after creation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for user info to be displayed (username, mood tier, etc.)
    await expect(page.locator('text=/Player|User|Welcome/i')).toBeVisible({ timeout: 10000 });
  });

  test('should persist user across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get the initial userId
    const userId1 = await page.evaluate(() => localStorage.getItem('userId'));

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that userId is the same
    const userId2 = await page.evaluate(() => localStorage.getItem('userId'));
    expect(userId1).toBe(userId2);
  });

  test('should handle localStorage clear and create new user', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial userId
    const userId1 = await page.evaluate(() => localStorage.getItem('userId'));
    expect(userId1).toBeTruthy();

    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should create a new user
    const userId2 = await page.evaluate(() => localStorage.getItem('userId'));
    expect(userId2).toBeTruthy();
    expect(userId2).not.toBe(userId1);
  });
});
