import { test, expect } from '@playwright/test';

test.describe('Admin - Dashboard ve Güvenlik', () => {
  test('Admin paneline başarıyla erişilebilmeli ve istatistikler yüklenmeli', async ({ page }) => {
    // 1. Doğrudan admin paneline git (Auth setup üzerinden giriş yapılmış olmalı)
    await page.goto('/de/admin/dashboard');
    
    // 2. URL'nin login'e düşmediğini doğrula
    await expect(page).toHaveURL(/\/de\/admin\/dashboard/);

    // 3. Admin başlığının veya kullanıcı adının görünür olduğunu doğrula
    await expect(page.locator('text=/turgaycelen03@gmail.com/i')).toBeVisible();

    // 4. Sol menünün yüklendiğini doğrula
    await expect(page.locator('nav').filter({ hasText: /Ürün Yönetimi|CRM/i })).toBeVisible();
  });
});
