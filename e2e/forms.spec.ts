import { test, expect } from '@playwright/test';

test.describe('Forms and Communication Flows', () => {

  test('should prefill contact form message when subject and body are in URL', async ({ page }) => {
    // Navigate to contact page with URL params (like from a Preisanfrage button)
    await page.goto('/de/contact?subject=Preisanfrage%3A%20Premium%20Sirup');
    
    // Wait for network to settle so client-side hydration happens
    await page.waitForLoadState('domcontentloaded');

    // Check if the textarea has the default value populated from the URL params
    const messageInput = page.locator('textarea[name="message"]');
    await expect(messageInput).toHaveValue(/Preisanfrage: Premium Sirup/);
  });

  test('should show validation errors on contact form when fields are empty', async ({ page }) => {
    await page.goto('/de/contact');
    
    // Try to submit the form without filling it
    const submitButton = page.locator('button[type="submit"]');
    
    // Depending on browser validation, this might just trigger native HTML5 validation
    // Playwright won't click if covered or disabled, but here it triggers the native UI.
    // We can evaluate validity:
    const nameInput = page.locator('input[name="name"]');
    const isValid = await nameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

  test('should show validation errors on register form when required fields are missing', async ({ page }) => {
    await page.goto('/de/register');
    
    const unvanInput = page.locator('input[name="unvan"]');
    const isValid = await unvanInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });

});
