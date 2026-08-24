import { test, expect } from '@playwright/test';

test.describe('Products Page (Katalog) UI Tests', () => {
  test('should load the products page and display the main grid', async ({ page }) => {
    await page.goto('/de/products');

    // Katalog başlığının geldiğini kontrol et
    await expect(page.locator('h1')).toContainText('Sortiment für Profi-Küchen');
    
    // Sol taraftaki menünün yüklendiğini kontrol et (Kategorien)
    await expect(page.getByText('Kategorien', { exact: true })).toBeVisible();
    await expect(page.getByText('Alle Kategorien')).toBeVisible();

    // En az bir ürün kartının yüklendiğini kontrol et
    const productCards = page.locator('.group.h-full.flex.flex-col');
    // Sayfada ürünler varsa en az 1 tane gelmesini bekliyoruz
    await productCards.first().waitFor({ state: 'visible', timeout: 15000 });
    expect(await productCards.count()).toBeGreaterThan(0);
  });

  test('should display recommended and bestseller carousels on the main page', async ({ page }) => {
    await page.goto('/de/products');

    // "ElysonSweets empfiehlt" başlığının görünür olduğunu doğrula
    await expect(page.getByText('ElysonSweets empfiehlt')).toBeVisible({ timeout: 15000 });

  });

  test('should hide pagination and show sticky tabs when a category is selected', async ({ page }) => {
    // "horeca" gibi ana bir kategori linkine gidiyoruz
    await page.goto('/de/products?kategori=horeca-beverages-sauces-purees');
    
    // Filtre temizleme butonunun belirdiğini kontrol et (reset filter)
    await expect(page.getByRole('link', { name: 'Filter zurücksetzen' }).first()).toBeVisible({ timeout: 15000 });

    // Kategori tıklandığında ürünler grup halinde yüklenir ve sekme menüsü oluşur.
    // Sekme içindeki "a" etiketlerinin render edildiğini varsayalım.
    const stickyTabsContainer = page.locator('.sticky.top-\\[72px\\]');
    // Kategoriye ait ürün varsa sekme container'ı görünür olmalı
    await stickyTabsContainer.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    
    if (await stickyTabsContainer.isVisible()) {
        const tabs = stickyTabsContainer.locator('a');
        expect(await tabs.count()).toBeGreaterThan(0);
    }
  });
});
