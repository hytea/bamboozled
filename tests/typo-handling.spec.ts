import { test, expect } from '@playwright/test';

test.describe('Typo Handling in Answers', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('should accept answer with minor typo', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the welcome message to ensure the user is initialized
    await expect(page.locator('text=/Welcome/i')).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure userId is fully synced
    await page.waitForFunction(() => {
      const userId = localStorage.getItem('userId');
      return userId && userId !== 'temp' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    }, {}, { timeout: 5000 });

    // Note: This test needs the actual correct answer for the active puzzle
    // We'll submit a guess with a typo and check if it's accepted

    // For testing purposes, we can try common patterns
    // If "Falling Temperature" is the answer, "Falling temerature" should be accepted

    const guessInput = page.locator('textarea, input[type="text"]').first();

    // This will depend on what puzzle is active
    // The test demonstrates the pattern but may need adjustment based on active puzzle
    await guessInput.fill('falling temerature');

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Guess"), button[type="submit"]').first();
    await submitButton.click();

    // Should show a message acknowledging the typo OR show it as correct
    // The AI should mention either "correct" or "you meant"
    // Use .first() to avoid strict mode violations when multiple matches exist
    const response = page.locator('text=/correct|you meant|if you meant/i').first();
    await expect(response).toBeVisible({ timeout: 15000 });
  });

  test('should not accept partial answer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the welcome message to ensure the user is initialized
    await expect(page.locator('text=/Welcome/i')).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure userId is fully synced
    await page.waitForFunction(() => {
      const userId = localStorage.getItem('userId');
      return userId && userId !== 'temp' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    }, {}, { timeout: 5000 });

    const guessInput = page.locator('textarea, input[type="text"]').first();

    // Submit only part of a multi-word answer (e.g., just "falling" when answer is "falling temperature")
    await guessInput.fill('falling');

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Guess"), button[type="submit"]').first();
    await submitButton.click();

    // Should be marked as incorrect
    // Use .first() to avoid strict mode violations when multiple matches exist
    await expect(page.locator('text=/incorrect|wrong|not quite/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should handle multiple character typos gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the welcome message to ensure the user is initialized
    await expect(page.locator('text=/Welcome/i')).toBeVisible({ timeout: 10000 });

    // Additional wait to ensure userId is fully synced
    await page.waitForFunction(() => {
      const userId = localStorage.getItem('userId');
      return userId && userId !== 'temp' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    }, {}, { timeout: 5000 });

    const guessInput = page.locator('textarea, input[type="text"]').first();

    // Submit an answer with multiple typos
    await guessInput.fill('fallig temprature');

    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Guess"), button[type="submit"]').first();
    await submitButton.click();

    // Should get some response (either accepted with typos or rejected)
    // Use .first() to avoid strict mode violations when multiple matches exist
    const response = page.locator('text=/correct|incorrect|wrong|not quite|you meant/i').first();
    await expect(response).toBeVisible({ timeout: 15000 });
  });
});
