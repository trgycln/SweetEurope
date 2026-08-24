import { test, expect } from '@playwright/test';

test.describe('Merkliste (Cart) Flow', () => {
  test('should add a product to the Merkliste and redirect to contact form with correct body', async ({ page }) => {
    // Navigate to the products page
    await page.goto('/de/products');
    await page.waitForLoadState('networkidle');

    // Find the first product card that has a "Zur Merkliste" button
    const addToCartButton = page.getByRole('button', { name: /Merkliste/i }).first();
    
    // Ensure the button is visible and click it
    await expect(addToCartButton).toBeVisible({ timeout: 15000 });
    await addToCartButton.click();

    // Verify that the Merkliste Sidebar appears and displays the item
    const sidebar = page.locator('.fixed.right-0.top-0.h-full.w-96');
    await expect(sidebar).toBeVisible();

    // Ensure the product is in the sidebar
    // Since we don't know the exact name of the first product, we just check that the list is not empty
    const cartItems = sidebar.locator('button:has-text("-")'); // Assuming the minus button is rendered for an item
    await expect(cartItems.first()).toBeVisible();

    // Click "Anfrage senden" inside the sidebar
    const requestButton = sidebar.getByRole('link', { name: /Anfrage senden/i });
    await expect(requestButton).toBeVisible();
    await requestButton.click();

    // Verify it redirects to the contact page
    await expect(page).toHaveURL(/\/de\/contact/);

    // Verify the message box is pre-filled with the product
    const messageInput = page.locator('textarea[name="message"]');
    await expect(messageInput).toBeVisible();
    const value = await messageInput.inputValue();
    expect(value).toContain('Ich möchte folgende Produkte anfragen/bestellen:');
    expect(value).toContain('1x');
  });
});
