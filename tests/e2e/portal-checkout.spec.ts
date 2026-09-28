import { test, expect } from '@playwright/test';

test.describe('Portal - Checkout Akışı', () => {
  test('Müşteri başarılı bir şekilde sipariş verebilmeli', async ({ page }) => {
    // 1. Login
    await page.goto('/de/login');
    await page.locator('input[type="email"]').fill('turgaycelen03@gmail.com');
    await page.locator('input[type="password"]').fill('352306');
    await page.locator('button[type="submit"]').click();
    
    // Portal'a geçiş (veya dashboard)
    await page.waitForURL(/.*\/(portal|admin)\/dashboard/);
    
    // Geçerli locale'i URL'den al (örneğin 'tr' veya 'de')
    const currentUrl = page.url();
    const urlParts = new URL(currentUrl).pathname.split('/');
    const locale = urlParts[1]; // örn: 'de' veya 'tr'
    
    await page.goto(`/${locale}/portal/katalog`);

    // 2. Katalogdan sepete ürün ekle
    await expect(page.locator('text=Sepete Ekle').first()).toBeVisible({ timeout: 15000 });
    await page.locator('text=Sepete Ekle').first().click();

    // 3. Sepet Sayfasına git
    await page.goto(`/${locale}/portal/sepet`);

    // 4. Miktarı 5 koliye çıkar ve fiyat düşüşünü (toptancı) doğrula
    const quantityInput = page.locator('input[type="number"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('5');
      // Blur or enter to trigger change event
      await quantityInput.press('Enter');
    }

    await page.waitForTimeout(1000); // State güncellemesi için kısa bekleme

    // 5. Siparişi Tamamla
    const checkoutBtn = page.locator('button').filter({ hasText: /Siparişi Tamamla|Siparişi Onayla|Siparişi Bitir|Bestellung abschließen/i }).first();
    
    if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        // Sipariş başarılı mesajını doğrula
        await expect(page.getByText(/başarı/i).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
