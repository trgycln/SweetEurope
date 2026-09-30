import { test, expect } from '@playwright/test';

test.describe('E2E Order Fulfillment Flow', () => {
  let orderId: string;

  test.beforeEach(async ({ page }) => {
    // Intercept Lexware API
    await page.route('https://api.lexware.io/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      console.log(`[MOCK] Lexware API intercepted: ${method} ${url}`);
      
      if (url.includes('/v1/invoices') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-invoice-id',
            status: 'draft',
            totalAmount: 100
          })
        });
      } else if (url.includes('/v1/invoices/mock-invoice-id/pdf')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          body: Buffer.from('mock pdf content')
        });
      } else if (url.includes('/v1/invoices/mock-invoice-id') && method === 'PUT') {
        // finalization
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-invoice-id',
            status: 'open'
          })
        });
      } else {
        await route.continue();
      }
    });

    // Intercept Resend API
    await page.route('https://api.resend.com/**', async (route) => {
      const url = route.request().url();
      console.log(`[MOCK] Resend API intercepted: ${url}`);
      
      const postData = route.request().postDataJSON();
      console.log('[MOCK] Resend Payload:', postData);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mock-resend-id' })
      });
    });
  });

  test('Complete Order and Invoice flow', async ({ browser }) => {
    // ----------------------------------------------------
    // STEP 1: CUSTOMER FLOW
    // ----------------------------------------------------
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    
    // Log browser console
    customerPage.on('console', msg => console.log(`[BROWSER]: ${msg.text()}`));
    customerPage.on('pageerror', err => console.log(`[BROWSER ERROR]: ${err.message}`));
    
    // Login
    await customerPage.goto('/tr/login');
    await customerPage.fill('input[type="email"]', 'test_e2e_dryrun@elysonsweets.de');
    await customerPage.fill('input[type="password"]', 'TestPassword123!');
    await customerPage.click('button[type="submit"]');
    
    // Wait for login to complete (redirect to dashboard or portal)
    await customerPage.waitForURL(/.*\/portal.*/);
    
    // Go to catalog
    await customerPage.goto('/tr/portal/katalog');
    
    // Add first product to cart
    // Wait for product cards to load
    await customerPage.waitForSelector('text=Sepete Ekle');
    const addToCartButton = customerPage.getByRole('button', { name: /Sepete Ekle/i }).first();
    await addToCartButton.waitFor({ state: 'visible' });
    await addToCartButton.click({ force: true });
    
    // Wait for modal to open and add to cart inside modal
    const modalContainer = customerPage.locator('.fixed.inset-0.z-50 .bg-white.rounded-2xl');
    await modalContainer.waitFor({ state: 'visible' });
    const modalConfirmButton = modalContainer.getByRole('button', { name: /Sepete Ekle/i });
    await modalConfirmButton.click({ force: true });
    // Cart is at the bottom of the catalog page, no need to navigate!
    
    // Select Vorkasse (Havale) and complete order
    // Check if there is an explicit selection for Vorkasse, or if it's default
    const vorkasseOption = customerPage.locator('input[value="vorkasse"]');
    if (await vorkasseOption.count() > 0) {
      await vorkasseOption.check();
    }
    // Accept cookie banner if present to avoid intercepting clicks
    const cookieAcceptBtn = customerPage.locator('button:has-text("Tümünü kabul et")');
    if (await cookieAcceptBtn.isVisible()) {
      await cookieAcceptBtn.click({ force: true });
    }

    const completeOrderButton = customerPage.locator('#complete-checkout-btn');
    // Wait for button to be enabled (meaning cart is not empty)
    await expect(completeOrderButton).toBeEnabled({ timeout: 10000 });
    // Click normally to ensure it's actionable
    await completeOrderButton.click();
    
    // Check for error toasts before waiting for URL
    // Wait for success page OR error
    await Promise.race([
        customerPage.waitForURL(/.*\/portal\/siparisler/),
        customerPage.waitForSelector('text=Sipariş oluşturulurken bir hata oluştu').then(() => { throw new Error('Order creation failed with toast error'); }),
        customerPage.waitForSelector('text=Firma bulunamadı').then(() => { throw new Error('Company not found error'); }),
        customerPage.waitForSelector('text=Normal sipariş oluşturulamadı').then(() => { throw new Error('Normal order creation failed due to stock or DB error'); }),
        customerPage.waitForSelector('text=Datenbankfehler').then(() => { throw new Error('Database error'); }),
        customerPage.waitForSelector('text=Yetersiz stok').then(() => { throw new Error('Insufficient stock error'); })
    ]);
    
    // Force a reload to bypass Next.js App Router cache if revalidatePath missed the [locale]
    await customerPage.reload();
    
    // Extract Order ID from the first link on the orders list page that is not 'yeni'
    const orderLink = customerPage.locator('a[href*="/portal/siparisler/"]:not([href*="yeni"])').first();
    await orderLink.waitFor({ state: 'visible', timeout: 45000 });
    const href = await orderLink.getAttribute('href');
    orderId = href?.split('/').pop() || '';
    
    console.log(`Order created with ID: ${orderId}`);
    expect(orderId).toBeTruthy();
    expect(orderId).not.toBe('yeni');

    // ----------------------------------------------------
    // STEP 2: ADMIN FLOW
    // ----------------------------------------------------
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    // Admin login using dynamically created test admin account
    await adminPage.goto('/tr/login');
    await adminPage.fill('input[type="email"]', 'admin_e2e_dryrun@elysonsweets.de');
    await adminPage.fill('input[type="password"]', 'AdminPassword123!');
    await adminPage.click('button[type="submit"]');
    
    await adminPage.waitForURL(/.*\/admin.*/);
    
    // Go to order details
    await adminPage.goto(`/tr/admin/operasyon/siparisler/${orderId}`);
    
    // Click "Ödeme Alındı & Fatura Kes"
    // Wait for the button. The exact text might be slightly different.
    const faturaKesButton = adminPage.locator('button', { hasText: 'Fatura Kes' }).first();
    await faturaKesButton.waitFor({ state: 'visible' });
    // Accept the native window.confirm dialog
    adminPage.once('dialog', dialog => dialog.accept());
    await faturaKesButton.click({ force: true });
    
    // Confirm modal if any (HTML based)
    const confirmButton = adminPage.locator('button:has-text("Evet")');
    if (await confirmButton.count() > 0 && await confirmButton.isVisible()) {
        await confirmButton.click({ force: true });
    }
    
    // Wait for invoice status to update
    await expect(adminPage.locator('text=kesildi').first()).toBeVisible({ timeout: 45000 });
    
    // Handle Cargo (DHL, Tracking, Yola Çıktı)
    const kargoSelect = adminPage.locator('#kargo-firmasi-select');
    if (await kargoSelect.count() > 0) {
      await kargoSelect.selectOption('DHL');
    }
    
    const takipNoInput = adminPage.locator('#kargo-takip-no-input');
    if (await takipNoInput.count() > 0) {
      await takipNoInput.fill('123456789');
    }
    
    const takipUrlInput = adminPage.locator('#kargo-takip-url-input');
    if (await takipUrlInput.count() > 0) {
      await takipUrlInput.fill('https://dhl.com/track/123456789');
    }
    
    const kargolaBtn = adminPage.locator('#kargola-btn');
    if (await kargolaBtn.count() > 0) {
      await kargolaBtn.click({ force: true });
      // The toast text is 'Sipariş "Yola Çıktı" olarak işaretlendi'
      await expect(adminPage.locator('text=olarak işaretlendi').first()).toBeVisible({ timeout: 45000 });
    }

    // ----------------------------------------------------
    // STEP 3: CUSTOMER VERIFICATION
    // ----------------------------------------------------
    await customerPage.reload();
    
    // Navigate to the specific order detail page
    const orderDetailLink = customerPage.locator(`a[href*="/portal/siparisler/${orderId}"]`).first();
    await orderDetailLink.click();
    
    // Wait for the details page to load by waiting for the page title or the button with a long timeout
    const faturayiIndirButton = customerPage.locator('a:has-text("Faturayı İndir")').first();
    await expect(faturayiIndirButton).toBeVisible({ timeout: 45000 });
    
    const kargomuTakipEtButton = customerPage.locator('a:has-text("Kargomu Takip Et")');
    await expect(kargomuTakipEtButton).toBeVisible({ timeout: 45000 });
    
    // Close contexts
    await customerContext.close();
    await adminContext.close();
  });
});
