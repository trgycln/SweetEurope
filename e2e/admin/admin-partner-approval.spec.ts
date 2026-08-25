import { test, expect } from '@playwright/test';

test.describe('Admin - Partner Onayı', () => {
  test('Admin müşteri profilleri listesini görebilmeli ve detayları inceleyebilmeli', async ({ page }) => {
    // 1. Müşteri Profilleri (Firmalar) sayfasına git
    // Not: Gerçek sayfa rotası /admin/crm/firmalar veya /admin/urun-yonetimi/fiyatlandirma-hub olabilir
    await page.goto('/de/admin/crm/firmalar');
    
    // Sayfanın yüklenmesini bekle
    await expect(page.locator('h1').filter({ hasText: /Firma|Müşteri/i }).first()).toBeVisible();

    // Listede eleman varsa ilkine tıkla
    const firstRow = page.locator('table tbody tr, .grid .card').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      
      // Detay sayfasının açıldığını onayla
      await expect(page.locator('text=/Durum|Aktiv/i').first()).toBeVisible();
    }
  });
});
