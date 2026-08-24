import { test, expect } from '@playwright/test';

test.describe('Search and Filter Flow', () => {
  test('should allow searching for a product and show results', async ({ page }) => {
    await page.goto('/de/products');

    // Find the search input
    const searchInput = page.getByPlaceholder(/Suchen...|Search...|Arama.../i).first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Type a query
    await searchInput.fill('Sirup');
    
    // Press Enter to trigger search
    await searchInput.press('Enter');

    // URL should be updated with the search query
    await expect(page).toHaveURL(/searchQuery=Sirup/i);

    // Grid should reload, so wait for the product cards
    // The H1 should say "Suchergebnisse" or similar if the title changes, but let's just check the cards
    const productCards = page.locator('.group.h-full.flex.flex-col');
    await productCards.first().waitFor({ state: 'visible', timeout: 15000 });

    // Ensure we have results
    expect(await productCards.count()).toBeGreaterThan(0);
  });
});
