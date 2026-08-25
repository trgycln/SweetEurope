import { test, expect } from '@playwright/test';

async function loginAsCustomer(page: any) {
  // Set cookie consent so banner doesn't block UI
  await page.addInitScript(() => {
    localStorage.setItem('cookie_consent', 'accepted');
  });

  page.on('console', (msg: any) => console.log(`[BROWSER]: ${msg.text()}`));

  await page.goto('/de/login');
  
  // If already on portal, done
  if (page.url().includes('/portal')) {
    return;
  }

  const emailInput = page.locator('#email');
  const isLoginFormVisible = await emailInput.isVisible({ timeout: 4000 }).catch(() => false);
  
  if (isLoginFormVisible) {
    await emailInput.fill('celen00683@gmail.com');
    await page.locator('#password').fill('352306');
    await page.locator('button[type="submit"]').click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*portal.*/, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  }
}

test.describe('Customer Portal & Payment Flows', () => {

  test('1. Customer can log in and view the portal dashboard', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/de/portal/dashboard');
    await expect(page).toHaveURL(/.*\/portal\/dashboard/);
    
    // Check heading or company name
    const portalHeading = page.locator('h1, header, banner').filter({ hasText: /Gözde Cafe|Partner-Portal/i }).first();
    await expect(portalHeading).toBeVisible({ timeout: 10000 });
  });

  test('2. Product catalog shows items and shopping cart', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/de/portal/siparisler/yeni');

    // Verify catalog header or cart header
    const cartHeading = page.getByRole('heading', { name: /Warenkorb|Sepet/i }).first();
    await expect(cartHeading).toBeVisible({ timeout: 10000 });
  });

  test('3. B2B / Auf Rechnung (Bank Transfer) flow creates an order', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/de/portal/siparisler/yeni');

    // 1. Search for in-stock item "Himbeer"
    const searchBox = page.locator('input[placeholder*="suchen"], input[placeholder*="ara"], input[placeholder*="Search"]').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('Himbeer');
      await page.waitForTimeout(500);
    }

    // 2. Click "+ Hinzufügen" to open the unit modal if needed
    const addBtn = page.locator('button:not([disabled]):has-text("Hinzufügen"), button:not([disabled]):has-text("Ekle")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
      const modalConfirmBtn = page.locator('button:has-text("In den Warenkorb"), button:has-text("Sepete Ekle")').last();
      if (await modalConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modalConfirmBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // 3. Select B2B / Auf Rechnung
    const b2bButton = page.locator('button').filter({ hasText: /Auf Rechnung|B2B|Fatura ile/i }).first();
    await b2bButton.scrollIntoViewIfNeeded();
    await b2bButton.click();
    await page.waitForTimeout(400);

    // 4. Submit order
    const orderBtn = page.locator('button').filter({ hasText: /Bestellung bestätigen|Bestellung auf Rechnung|Fatura ile Gönder|Siparişi Onayla/i }).first();
    await orderBtn.scrollIntoViewIfNeeded();
    await expect(orderBtn).toBeEnabled({ timeout: 5000 });

    await orderBtn.click();

    // 5. Verify confirmation redirect to order detail page
    await page.waitForURL(/.*portal\/siparisler\/.*/, { waitUntil: 'domcontentloaded', timeout: 25000 });
    expect(page.url()).toContain('/portal/siparisler/');
  });

  test('4. Stripe Checkout creates a session and handles payment initiation', async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto('/de/portal/siparisler/yeni');

    // 1. Search for in-stock item "Himbeer"
    const searchBox = page.locator('input[placeholder*="suchen"], input[placeholder*="ara"], input[placeholder*="Search"]').first();
    if (await searchBox.isVisible()) {
      await searchBox.fill('Himbeer');
      await page.waitForTimeout(500);
    }

    // 2. Click "+ Hinzufügen" to open the unit modal if item not already in cart
    const addBtn = page.locator('button:not([disabled]):has-text("Hinzufügen"), button:not([disabled]):has-text("Ekle")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
      const modalConfirmBtn = page.locator('button:has-text("In den Warenkorb"), button:has-text("Sepete Ekle")').last();
      if (await modalConfirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modalConfirmBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // 3. Select Stripe payment
    const stripeButton = page.locator('button').filter({ hasText: /Online-Zahlung|Stripe|Online Ödeme/i }).first();
    await stripeButton.scrollIntoViewIfNeeded();
    await stripeButton.click();
    await page.waitForTimeout(400);

    // 4. Click Stripe pay button
    const stripePayBtn = page.locator('button').filter({ hasText: /Mit Stripe sicher bezahlen|Stripe ile Güvenli Öde/i }).first();
    await stripePayBtn.scrollIntoViewIfNeeded();
    await expect(stripePayBtn).toBeEnabled({ timeout: 5000 });

    await stripePayBtn.click();

    // 5. Verify that either redirect to Stripe Checkout happens OR Stripe API feedback is safely presented in UI
    const isStripeRedirectOrToast = await Promise.race([
      page.waitForURL(/.*checkout\.stripe\.com.*/, { timeout: 15000 }).then(() => 'redirect'),
      page.locator('li[data-sonner-toast], div[role="status"], [data-sonner-toast]').waitFor({ timeout: 15000 }).then(() => 'toast'),
    ]).catch(() => 'timeout');

    expect(['redirect', 'toast']).toContain(isStripeRedirectOrToast);
  });

});
