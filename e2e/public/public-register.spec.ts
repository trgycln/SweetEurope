import { test, expect } from '@playwright/test';

test.describe('Public - Partner Başvurusu Akışı', () => {
  test('Yeni bir işletme partner başvuru formunu doldurup gönderebilmeli', async ({ page }) => {
    // 1. Kayıt sayfasına git
    await page.goto('/de/register');
    
    // Formun yüklenmesini bekle
    await expect(page.locator('h1').filter({ hasText: /Konto|Register/i })).toBeVisible();

    // 2. Form alanlarını doldur
    // Not: Bu alanlar RegisterFormClient.tsx içindeki name attribute'larına göre seçiliyor.
    await page.locator('input[name="firmaAd"]').fill('E2E Test GmbH');
    
    // Select için uygun seçimi yap (Örn: Firma Tipi)
    await page.locator('select[name="firmaTipi"]').selectOption({ index: 1 }); // İlk geçerli seçeneği seç
    
    await page.locator('input[name="iletisimKisi"]').fill('Max Mustermann');
    
    // Benzersiz bir e-posta üret (Aynı e-posta ile kayıt olmayı denemesin)
    const uniqueEmail = `test.partner.${Date.now()}@example.com`;
    await page.locator('input[name="email"]').fill(uniqueEmail);
    
    await page.locator('input[name="telefon"]').fill('+49 123 4567890');
    
    // Adres bilgileri
    await page.locator('input[name="adres.sokak"]').fill('Teststraße 1');
    await page.locator('input[name="adres.sehir"]').fill('Berlin');
    await page.locator('input[name="adres.postaKodu"]').fill('10115');
    await page.locator('input[name="adres.ulke"]').fill('Deutschland');
    
    // Vergi numarası
    await page.locator('input[name="vergiNo"]').fill('DE123456789');

    // Şifreler
    await page.locator('input[name="password"]').fill('Test123456!');
    await page.locator('input[name="passwordConfirm"]').fill('Test123456!');

    // 3. Formu gönder
    await page.locator('button[type="submit"]').click();

    // 4. Başarı mesajı / Yönlendirme bekle
    // Sistem başarılı kayıtta bir modal, toast veya login sayfasına yönlendirme yapıyor olmalı.
    // Şimdilik başarılı ibaresini veya yönlendirmeyi bekliyoruz.
    await expect(page.locator('text=/erfolgreich|başarıyla|success|anmelden/i')).toBeVisible({ timeout: 15000 });
  });
});
