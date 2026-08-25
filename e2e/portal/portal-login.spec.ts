import { test, expect } from '@playwright/test';

test.describe('Portal - Bayi Girişi ve Dashboard', () => {
  test('Bayi portala giriş yapabilmeli ve dashboardu görüntüleyebilmeli', async ({ page }) => {
    // 1. Giriş yap (Şimdilik admin yetkileriyle test ediyoruz, portal rotalarına erişimi varsa)
    await page.goto('/de/login');
    
    await page.locator('input[type="email"]').fill('turgaycelen03@gmail.com');
    await page.locator('input[type="password"]').fill('352306');
    await page.locator('button[type="submit"]').click();

    // Yönlendirmeyi bekle (Admin olduğu için admin/dashboard'a gider, portal'a manuel geçelim)
    await page.waitForURL(/\/de\/admin\/dashboard/);
    
    // 2. Portal dashboard'a git
    await page.goto('/de/portal/dashboard');

    // 3. Portal dashboardunun başarıyla yüklendiğini kontrol et
    await expect(page.locator('h1').filter({ hasText: /Portal|Dashboard/i }).first()).toBeVisible();
    
    // Müşteri cari hesap veya sipariş özetlerinin göründüğünü kontrol et
    await expect(page.locator('text=/Siparişler|Finanslar|Katalog/i').first()).toBeVisible();
  });
});
