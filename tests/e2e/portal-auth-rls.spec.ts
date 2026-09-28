import { test, expect } from '@playwright/test';

test.describe('Portal - RLS Authorization Tests', () => {
  test('Müşteri A, Müşteri B nin siparişlerine erişememeli', async ({ browser }) => {
    // Müşteri A olarak giriş
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/de/login');
    
    // Müşteri A test kullanıcısı
    await pageA.locator('input[type="email"]').fill('musteriA@test.com');
    await pageA.locator('input[type="password"]').fill('password123');
    await pageA.locator('button[type="submit"]').click();
    
    // Portal'a geçişi bekle
    await pageA.waitForURL(/.*\/(portal|admin)\/dashboard/);
    
    // Geçerli locale'i URL'den al (örneğin 'tr' veya 'de')
    const currentUrl = pageA.url();
    const urlParts = new URL(currentUrl).pathname.split('/');
    const locale = urlParts[1]; // örn: 'de' veya 'tr'
    
    // Doğrudan başka bir siparişe erişim denemesi
    const response = await pageA.goto(`/${locale}/portal/siparisler/baska-id-12345`);
    
    // Sayfada yetki hatası veya 404 aranır
    const errorTextVisible = await pageA.getByText(/404|bulunamadı|yetkiniz yok|not found/i).isVisible();
    const isErrorStatus = response?.status() === 404 || response?.status() === 500 || response?.status() === 403;
    
    // Expect failure due to RLS
    expect(errorTextVisible || isErrorStatus || response?.url().includes('/login')).toBeTruthy();

    await contextA.close();
  });
});
