import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
  test('should change the language from DE to TR and update URLs', async ({ page }) => {
    // Start on the German homepage
    await page.goto('/de');

    // Find the language switcher button in the navbar (usually a globe icon or the word "DE")
    // Assuming there is a button that opens a dropdown, or direct links
    // Since we don't have the exact DOM structure, we'll look for a link that points to /tr/
    const trLink = page.locator('a[href^="/tr/"]').first();
    
    // Sometimes it's inside a hover menu, so we might need to hover the language switcher first
    // Let's assume the language switcher has a text "DE"
    const langSwitcher = page.getByRole('button', { name: /DE|Sprache|Language/i }).first();
    if (await langSwitcher.isVisible()) {
        await langSwitcher.hover();
    }

    await expect(trLink).toBeVisible({ timeout: 10000 });
    
    // Click to switch language to Turkish
    await trLink.click();

    // Verify the URL changed to /tr/
    await expect(page).toHaveURL(/\/tr/);

    // Verify some text on the page is now in Turkish
    // Assuming "Produkte" becomes "Ürünler" or "Katalog" in the navbar
    const trKatalogLink = page.getByRole('link', { name: /Ürünler|Katalog/i }).first();
    await expect(trKatalogLink).toBeVisible();
  });
});
