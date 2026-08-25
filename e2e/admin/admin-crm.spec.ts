import { test, expect } from '@playwright/test';

test.describe('Admin - CRM Mesajları', () => {
  test('Admin iletişim formundan gelen mesajları okuyabilmeli', async ({ page }) => {
    // 1. CRM Mesajlar sayfasına git
    await page.goto('/de/admin/crm/mesajlar');
    
    // 2. Sayfanın ve gelen mesajlar listesinin yüklendiğini bekle
    await expect(page.locator('h1').filter({ hasText: /İletişim Mesajları|Nachrichten/i })).toBeVisible();

    // 3. Listede mesaj varsa, ilkine tıkla
    // Mesaj kartları genellikle .p-4 veya benzeri class'larda olur, yazar ismini arayabiliriz
    const firstMessage = page.locator('text=Sebastian Palma').first(); // Önceki testte bulduğumuz örnek isim
    
    // Eğer o isim yoksa listedeki herhangi bir ilk mesaja tıkla
    const messageItem = page.locator('div.border-b').first(); // veya uygun bir liste elemanı locator'u
    if (await messageItem.isVisible()) {
      await messageItem.click();
      
      // Detay ekranının (sağ panel) açıldığını ve okunabildiğini onayla
      await expect(page.locator('text=/Mesaj Seçilmedi/i')).toBeHidden();
    }
  });
});
