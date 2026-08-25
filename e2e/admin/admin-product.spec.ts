import { test, expect } from '@playwright/test';

test.describe('Admin - Ürün ve Fiyat Yönetimi', () => {
  test('Admin ürünler listesini görebilmeli ve bir ürünün detayına girebilmeli', async ({ page }) => {
    // 1. Ürünler sayfasına git
    await page.goto('/de/admin/urun-yonetimi/urunler');
    
    // 2. Ürün listesinin yüklenmesini bekle
    await expect(page.locator('h1').filter({ hasText: /Ürün Yönetimi/i })).toBeVisible();

    // 3. Tablodaki ilk ürünün düzenle/detay butonuna veya ismine tıkla
    // Tablodaki ilk satırı bul
    const firstProductRow = page.locator('table tbody tr').first();
    await expect(firstProductRow).toBeVisible();
    
    // Ürün ismine (linke) tıkla
    const productLink = firstProductRow.locator('a').first();
    await productLink.click();

    // 4. Ürün detay/düzenleme sayfasının açıldığını doğrula
    await expect(page.locator('text=/Fiyatlandırma|Stok|Genel Bilgiler/i').first()).toBeVisible();
    
    // Not: E2E testlerinde gerçek ürün silmemek veya fiyatı kalıcı bozmamak için
    // şimdilik sadece sayfanın render edildiğini ve verinin çekildiğini doğruluyoruz.
    // Gerçek bir "Test Ürünü" oluşturulacaksa, burada "Yeni Ürün Ekle" butonuna basılıp doldurulabilir.
  });
});
