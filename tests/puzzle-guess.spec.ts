import { test, expect } from '@playwright/test';

test.describe('Puzzle Guess Submission', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('should display active puzzle', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for puzzle to load
    await expect(page.locator('img[alt*="puzzle" i], img[src*="puzzle"]')).toBeVisible({ timeout: 10000 });
  });

  test('should submit a guess', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the welcome message to ensure the user is initialized
    await expect(page.locator('text=/Welcome/i')).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure userId is fully synced
    await page.waitForFunction(() => {
      const userId = localStorage.getItem('userId');
      return userId && userId !== 'temp' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    }, {}, { timeout: 5000 });

    // Find the guess input - it might be a textarea or input
    const guessInput = page.locator('textarea, input[type="text"]').first();
    await expect(guessInput).toBeVisible({ timeout: 10000 });

    // Type a guess
    await guessInput.fill('test guess');

    // Find and click submit button
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Guess"), button[type="submit"]').first();
    await submitButton.click();

    // The response should appear in the chat/message area
    // Use .first() to avoid strict mode violations when multiple matches exist
    await expect(page.locator('text=/incorrect|wrong|not quite|correct/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should show incorrect message for wrong answer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const guessInput = page.locator('textarea, input[type="text"]').first();
    await guessInput.fill('definitely wrong answer xyz123');

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Guess"), button[type="submit"]').first();
    await submitButton.click();

    // Should show incorrect/wrong message
    await expect(page.locator('text=/incorrect|wrong|not quite/i')).toBeVisible({ timeout: 15000 });
  });
});
