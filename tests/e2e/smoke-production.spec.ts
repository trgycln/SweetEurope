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

test.describe('Authenticated E2E Flow (Login & Cart)', () => {
  test('should login, add a product to cart and reach checkout if credentials exist', async ({ page }) => {
    // Sadece TEST_USER_EMAIL ve TEST_USER_PASSWORD tanımlıysa çalışır
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 'Test credentials (TEST_USER_EMAIL, TEST_USER_PASSWORD) are not provided in environment. Skipping.');

    // 1. Giriş Sayfasına Git
    const response = await page.goto('/tr/login', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    
    // 2. Formu Doldur ve Giriş Yap
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL as string);
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD as string);
    await page.click('button[type="submit"]');

    // 3. Başarılı girişi bekle (Portal yönlendirmesi)
    await page.waitForURL('**/portal/**', { timeout: 15000 });

    // 4. Katalog sayfasına git
    await page.goto('/tr/portal/katalog', { waitUntil: 'domcontentloaded' });

    // 5. İlk ürünün "Sepete Ekle" butonuna tıkla
    // Buton üzerinde svg class'ı (lucide veya react-icons) veya text bazlı seçici
    const addToCartButton = page.locator('button:has(svg), button[title*="Sepet"], button[title*="Warenkorb"]').filter({ hasText: /Sepete Ekle|In den Warenkorb|/ }).first();
    // UniversalProductCard'da buton genellikle text'siz sadece icon olabilir, veya text içerir.
    // Garanti olsun diye her ikisini de kapsayan bir locator:
    const fallbackButton = page.locator('.group button').first(); 
    
    // Sepete ekle butonu en az 1 tane gelene kadar bekle
    await fallbackButton.waitFor({ state: 'visible', timeout: 15000 });
    await fallbackButton.click();

    // 6. Yeni Sipariş / Sepet sayfasına git
    await page.goto('/tr/portal/siparisler/yeni?openCart=true', { waitUntil: 'domcontentloaded' });

    // 7. Sepette Checkout butonunun / alanının yüklendiğini teyit et
    // Genellikle siparişi onayla veya ileri adımı içeren bir buton olur.
    // Burada sayfanın tamamen çökmeyip sipariş ekranının açılması temel hedeftir.
    const cartSummaryOrButton = page.locator('text=/Sipariş|Checkout|Bestellen|Özet|Toplam/i').first();
    await expect(cartSummaryOrButton).toBeVisible({ timeout: 10000 });
  });
});
