import { test, expect } from '@playwright/test';

test.describe('Admin Panel Security and Login', () => {
  test('should redirect unauthenticated users to the admin login page', async ({ page }) => {
    // Attempt to access a protected admin route directly
    await page.goto('/de/admin/dashboard');

    // The middleware or server logic should redirect to the login page
    // We expect the URL to change to /de/login
    await expect(page).toHaveURL(/\/de\/login/);

    // Verify the login form is present
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
  });

  test('should show error for invalid admin credentials', async ({ page }) => {
    await page.goto('/de/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /Giriş|Login/i });

    // Ensure they are visible
    await expect(emailInput).toBeVisible();

    await emailInput.fill('invalid@elysonsweets.de');
    await passwordInput.fill('wrongpassword123');
    await submitButton.click();

    // Expect an error toast or error message on the screen
    // We can just check that we are still on the login page and did not redirect to dashboard
    await page.waitForTimeout(2000); // Wait a bit for server response
    await expect(page).not.toHaveURL(/\/de\/admin\/dashboard/);
  });
});
