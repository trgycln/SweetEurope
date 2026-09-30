import { test, expect } from '@playwright/test';

// Override the baseURL for this test file to point to production
test.use({ baseURL: 'https://elysonsweets.de' });

test.describe('Production Smoke Test', () => {
  test('should load the homepage and return HTTP 200 without hydration errors', async ({ page }) => {
    // Navigate to homepage
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Verify HTTP status code
    expect(response?.status()).toBe(200);

    // Basic check to ensure the page loaded (check for a common element like the header or title)
    // We just check if the page has a title and is not showing a Next.js error overlay
    await expect(page).toHaveTitle(/Elyson/i);
    
    // Check for hydration error overlay which Next.js injects in dev (not in prod, but just to be safe)
    const nextjsError = page.locator('nextjs-portal');
    await expect(nextjsError).toHaveCount(0);
  });

  test('should render catalog page and display at least one product (DB connection check)', async ({ page }) => {
    const response = await page.goto('/de/products', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Wait for the product grid to load products. We expect at least one product card.
    // In public catalog, there are product cards with links to products
    const anyProductCard = page.locator('a[href*="/products/"]').first();
    await anyProductCard.waitFor({ state: 'visible', timeout: 15000 });
    
    // Verify it's visible
    await expect(anyProductCard).toBeVisible();
  });

  test('should load the login page and render the login form correctly', async ({ page }) => {
    const response = await page.goto('/tr/login', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // Verify login form is visible
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // STRICT RULE: Do not fill or submit the form!
  });
});
