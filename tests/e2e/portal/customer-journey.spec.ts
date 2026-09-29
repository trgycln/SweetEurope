import { test, expect } from '@playwright/test';

test.describe('B2B Customer Portal E2E Flow', () => {
  const TEST_USER = {
    email: 'test_musteri@elysonsweets.de',
    password: 'password123'
  };

  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X/12 mobile viewport

  test('Mobile login, catalog, cart, checkout, and push notification', async ({ page, context }) => {
    // Grant notifications permissions
    await context.grantPermissions(['notifications']);
    
    // 1. Mobile login
    await page.goto('/de/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Accept cookies if present to unblock UI
    const acceptCookies = page.locator('button', { hasText: /(Akzeptieren|Kabul|Accept)/i });
    if (await acceptCookies.isVisible()) {
        await acceptCookies.click();
    }
    
    await page.click('button[type="submit"]', { force: true });

    // Debug any error messages on the page
    const errorMsg = page.locator('.text-red-500, .bg-red-50');
    if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log("Login Error:", await errorMsg.textContent());
    }

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*\/portal\/dashboard/, { timeout: 10000 });

    // Wait for push notification subscribe API call if it automatically happens
    // Or we click the banner if it shows up
    const pushBannerButton = page.locator('button', { hasText: /(Bildirimleri Aç|Benachrichtigungen aktivieren)/i });
    if (await pushBannerButton.isVisible()) {
      const pushResponsePromise = page.waitForResponse(response => 
        response.url().includes('/api/push/subscribe') && response.status() === 200
      );
      await pushBannerButton.click();
      await pushResponsePromise;
    }

    // 2. Add product to cart from catalog
    // We navigate to catalog page or dashboard's quick order
    await page.goto('/de/portal/katalog'); // Note: Adjust if catalog route is different
    
    // Click the first "Add to Cart" button (adjust selector based on actual text)
    const addToCartButton = page.locator('button', { hasText: /(Sepete Ekle|In den Warenkorb|Add to Cart)/i }).first();
    // If catalog needs data loading, we wait
    await expect(addToCartButton).toBeVisible({ timeout: 15000 });
    await addToCartButton.click();

    // 3. Click cart icon (Test clickability for z-index/pointer-events issues)
    const cartButton = page.locator('header button').filter({ has: page.locator('svg.lucide-shopping-cart, svg') }).last();
    // Since there are multiple buttons in header, we can just use the title or a more robust locator
    // Let's use a simpler locator based on the icon class (FiShoppingCart generates an SVG, often without specific classes if not passed)
    // Actually, we can just find the button that contains the overall cart count, or use the aria-label / title if available.
    // The button has title="Neue Bestellung / Warenkorb" or similar.
    const cartBtn = page.locator('header button[title*="Warenkorb"], header button[title*="Sepet"], header button[title*="السلة"]').first();
    await expect(cartBtn).toBeVisible();
    await expect(cartBtn).toBeEnabled();
    await cartBtn.click();

    // 4. Complete checkout
    // Now the checkout button is inside the drawer.
    const checkoutButton = page.locator('button', { hasText: /(Siparişi Tamamla|Kostenpflichtig bestellen|Zur Kasse|Bestellung abschließen)/i });
    await expect(checkoutButton).toBeVisible();
    // await checkoutButton.click(); // Commented out to prevent real checkout until mocked properly
    
    // If mocked, we would expect a success redirect
    // await expect(page).toHaveURL(/.*\/portal\/siparisler/);
  });
});
