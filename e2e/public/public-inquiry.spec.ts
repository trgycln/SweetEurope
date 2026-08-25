import { test, expect } from '@playwright/test';

test.describe('Public - Fiyat Talebi (Inquiry) Akışı', () => {
  test('Müşteri katalogdan ürün seçip fiyat talebi gönderebilmeli', async ({ page }) => {
    // 1. Ürünler sayfasına git
    await page.goto('/de/products');
    
    // Ürün listesinin yüklenmesini bekle
    await expect(page.locator('h1').filter({ hasText: /Katalog|Produkte/i })).toBeVisible();

    // 2. İlk ürünün detay sayfasına git
    // 'Details' butonunu bul
    const detailsButton = page.getByRole('link', { name: /Details/i }).first();
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();

    // 3. Detay sayfasında "Anfrage senden" butonuna tıkla
    // Buton metni dile göre değişebiliyor, bu yüzden geniş bir regex kullanıyoruz
    const anfrageButton = page.getByRole('link', { name: /Anfrage senden|Preisanfrage stellen/i });
    await expect(anfrageButton).toBeVisible();
    await anfrageButton.click();

    // 4. İletişim formuna yönlendirildiğimizi ve URL'de subject parametresi olduğunu doğrula
    await expect(page).toHaveURL(/\/de\/contact\?subject=Preisanfrage/);

    // 5. Form alanlarının doldurulması
    await page.locator('input[name="name"]').fill('E2E Test Müşterisi');
    await page.locator('input[name="email"]').fill('e2e-test@example.com');
    // Mesaj alanı otomatik dolmuş olmalı, sadece ekleme yapalım
    const messageField = page.locator('textarea[name="message"]');
    const currentValue = await messageField.inputValue();
    expect(currentValue).toContain('Preisanfrage');
    await messageField.fill(currentValue + '\n\nBu otomatik bir E2E test mesajıdır.');

    // 6. Formu gönder
    await page.locator('button[type="submit"]').click();

    // 7. Başarı mesajının çıkmasını bekle
    // Toast mesajı veya başarı metni çıkmalı (Örn: "başarıyla gönderildi")
    await expect(page.locator('text=/erfolgreich|başarıyla|success/i')).toBeVisible({ timeout: 10000 });
  });
});
