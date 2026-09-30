import { test, expect } from '@playwright/test';

test.describe('B2B Customer Portal E2E Flow', () => {
  const TEST_USER = {
    email: 'test_musteri@elysonsweets.de',
    password: 'password123'
  };

  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X/12 mobile viewport
  test.setTimeout(60000);

  test('Mobile login, catalog, cart, checkout, and push notification', async ({ page, context }) => {
    // Grant notifications permissions
    await context.grantPermissions(['notifications']);
    
    // 1. Mobile login
    await page.goto('/de/login');
    console.log('Current URL after goto:', page.url());
    const content = await page.content();
    if (!content.includes('type="email"')) console.log('Page content does not have type="email" input. Content size:', content.length);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
    
    // Test password toggle
    const toggleBtn = page.locator('button[aria-label="Şifreyi göster/gizle"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
    await toggleBtn.click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
    
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
    
    // Click the first "Add to Cart" button on the grid
    const addToCartButton = page.getByRole('button', { name: /(Sepete Ekle|In den Warenkorb|Add to Cart)/i }).filter({ visible: true }).first();
    await expect(addToCartButton).toBeVisible({ timeout: 15000 });
    await addToCartButton.click();

    // The modal opens. We need to click "In den Warenkorb" inside the modal.
    // The modal has a z-50 container
    const modalConfirmButton = page.locator('.fixed.z-50 button', { hasText: /(In den Warenkorb|Sepete Ekle)/i }).filter({ visible: true }).last();
    await expect(modalConfirmButton).toBeVisible({ timeout: 5000 });
    await modalConfirmButton.click();
    
    // Wait for the modal to disappear
    await expect(modalConfirmButton).toBeHidden({ timeout: 5000 });

    // Verify LocalStorage persistence
    await page.reload();
    await page.waitForLoadState('networkidle'); // Wait for hydration and localstorage read

    // 3. Click cart icon to test smooth scrolling to the cart checkout section
    const cartBtn = page.locator('header button[title*="Warenkorb"], header button[title*="Sepet"], header button[title*="السلة"]').first();
    await expect(cartBtn).toBeVisible();
    await expect(cartBtn).toBeEnabled();
    await cartBtn.click({ force: true });

    // Verify page scrolled to and displays the cart checkout section
    const cartSection = page.locator('#cart-checkout-section');
    await expect(cartSection).toBeVisible({ timeout: 10000 });

    // Verify detailed calculations exist in the cart section (MwSt / KDV and Versandkosten / Kargo)
    await expect(cartSection.locator('text=/(MwSt\\.|KDV)/i').first()).toBeVisible({ timeout: 5000 });
    await expect(cartSection.locator('text=/(Versandkosten|Kargo)/i').first()).toBeVisible();

    // 4. Complete checkout inside #cart-checkout-section
    const checkoutButton = cartSection.locator('button', { hasText: /(Siparişi Tamamla|Zur Kasse)/i });
    await expect(checkoutButton).toBeVisible();
    await expect(checkoutButton).toBeEnabled();
    await checkoutButton.click();

    // Wait for success toast
    const successToast = page.locator('text=/(Ihre Bestellung wurde erfolgreich aufgegeben|Siparişiniz başarıyla alındı)/i').first();
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // Verify URL
    await page.waitForURL('**/portal/siparisler', { timeout: 10000 });

    // Verify Cart icon count is 0 (badge is removed when 0)
    await expect(cartBtn).toHaveText('', { timeout: 5000 });

    // Order list table is hidden on mobile in favor of cards.
    // The successful toast and URL redirect are sufficient to verify checkout completion.
  });
});
