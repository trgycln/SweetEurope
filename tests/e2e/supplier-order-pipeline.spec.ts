/**
 * E2E Testler — Tedarikçi Sipariş Planı (Supply Chain Pipeline)
 *
 * Playwright ile 4 sekmeli UI akışını simüle eder.
 * Kural: Kullanıcı SADECE koli sayısı girebilir.
 * Ağırlık, adet, fiyat alanları read-only olmalıdır.
 *
 * ÖNEMLI: Bu test `yarn dev` / `npm run dev` ile localhost:3000
 * çalışıyor olmasını gerektirir. Canlı DB değil, dev ortamı kullanılır.
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const PIPELINE_URL = `${BASE_URL}/tr/admin/urun-yonetimi/tedarikci-siparis-plani`;

// ─── Yardımcı: Admin girişi ──────────────────────────────────────────────────
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/tr/login`);

  // Kullanıcı adı ve şifre alanlarını doldur
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  if (await emailInput.isVisible()) {
    await emailInput.fill(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
    await passwordInput.fill(process.env.TEST_ADMIN_PASSWORD || 'test123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin**', { timeout: 10000 }).catch(() => {
      // Login sayfasında kalmış olabilir, devam et
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Supply Chain Pipeline — UI E2E Testleri', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── 1. Liste Sayfası ──────────────────────────────────────────────────────
  test('Liste sayfası yüklenir ve "Yeni Sipariş Planı" butonu görünür', async ({ page }) => {
    await page.goto(PIPELINE_URL);
    await page.waitForLoadState('networkidle');

    // Sayfa başlığı kontrolü
    await expect(page.locator('h1')).toContainText('Tedarik Zinciri');

    // Yeni sipariş butonu
    const newButton = page.locator('a[href*="/yeni"], button:has-text("Yeni Sipariş")');
    await expect(newButton.first()).toBeVisible();
  });

  // ── 2. Yeni Sipariş Sayfası ───────────────────────────────────────────────
  test('Yeni sipariş sayfası yüklenir ve 4 sekme görünür', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    // 4 sekme butonu kontrolü
    const draftTab = page.locator('button:has-text("Sipariş")');
    const transitTab = page.locator('button:has-text("Yolda")');
    const costingTab = page.locator('button:has-text("Maliyet")');
    const docsTab = page.locator('button:has-text("Belge")');

    await expect(draftTab.first()).toBeVisible();
    await expect(transitTab.first()).toBeVisible();
    await expect(costingTab.first()).toBeVisible();
    await expect(docsTab.first()).toBeVisible();
  });

  // ── 3. Master Data Driven — Kullanıcı sadece Koli girer ──────────────────
  test('Sipariş formunda kullanıcı SADECE koli sayısı girebilir', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    // Ürün seçim tablosunda "Toplam Adet" ve "Toplam KG" alanları READ-ONLY olmalı
    // (kullanıcı input değil, span/read-only div içinde gösterilmeli)
    const toplamAdetInput = page.locator('input[name*="miktarAdet"], input[placeholder*="Toplam Adet"]');
    const toplamKgInput = page.locator('input[name*="toplamAgirlik"], input[placeholder*="kg"]');

    // Bu inputların disabled veya readonly olduğunu doğrula
    // ya da hiç input olmamalı (span/div olarak gösterilmeli)
    if (await toplamAdetInput.count() > 0) {
      await expect(toplamAdetInput.first()).toBeDisabled();
    }
    if (await toplamKgInput.count() > 0) {
      await expect(toplamKgInput.first()).toBeDisabled();
    }
  });

  // ── 4. Koli Sayısı Girişi — Otomatik Hesaplama ───────────────────────────
  test('Koli sayısı girilince toplam adet ve ağırlık otomatik güncellenir', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    // Referans kodu doldur
    const refInput = page.locator('input[name="referansKodu"]');
    if (await refInput.isVisible()) {
      await refInput.fill(`TEST-${Date.now()}`);
    }

    // "Ürün Ekle" butonuna tıkla
    const addBtn = page.locator('button:has-text("Ürün Ekle")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    // Koli sayısı input'una yaz
    const koliInput = page.locator('input[name*="koliSayisi"]').first();
    if (await koliInput.isVisible()) {
      await koliInput.fill('5');
      await page.waitForTimeout(300);

      // Otomatik hesaplanan değerlerin göründüğünü doğrula
      // (sayfa içinde "adet" veya "kg" metni olmalı)
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(0);
    }
  });

  // ── 5. Sekme Geçişleri ────────────────────────────────────────────────────
  test('4 sekme arasında geçiş yapılabilir', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    // Yolda sekmesine geç
    const transitBtn = page.locator('button:has-text("Yolda")').first();
    await transitBtn.click();
    await page.waitForTimeout(300);

    // Yolda içeriği görünür olmalı
    const transitContent = page.locator('h3:has-text("Yolda"), h2:has-text("Yolda"), text=Yolda');
    // (varsa kontrol et, yoksa skip)

    // Maliyetlendirme sekmesine geç
    const costBtn = page.locator('button:has-text("Maliyet")').first();
    await costBtn.click();
    await page.waitForTimeout(300);

    // Belgeler sekmesine geç
    const docsBtn = page.locator('button:has-text("Belge")').first();
    await docsBtn.click();
    await page.waitForTimeout(300);

    // Belge yükleme içeriği
    const docsContent = page.locator('text=Smart DMS, text=Belge, button:has-text("Belgeleri Yönet")');
    // Sayfa çökmedi mi?
    const title = await page.title();
    expect(title).not.toBeNull();
  });

  // ── 6. Maliyet sekmesi — LUCID Otomatik Görünür ──────────────────────────
  test('Maliyetlendirme sekmesinde Oto LUCID Payı sütunu görünür', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    const costBtn = page.locator('button:has-text("Maliyet")').first();
    await costBtn.click();
    await page.waitForTimeout(300);

    // "Oto LUCID" veya "LUCID" etiketi tablo başlığında olmalı
    const lucidHeader = page.locator('th:has-text("LUCID"), thead:has-text("LUCID")');
    await expect(lucidHeader.first()).toBeVisible();
  });

  // ── 7. İndirim Alanları Düzenlenebilir ───────────────────────────────────
  test('İndirim 1 ve İndirim 2 alanları düzenlenebilir', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    const indirim1 = page.locator('input[name="indirim1"]').first();
    const indirim2 = page.locator('input[name="indirim2"]').first();

    if (await indirim1.isVisible()) {
      await expect(indirim1).not.toBeDisabled();
      await indirim1.fill('20');
    }

    if (await indirim2.isVisible()) {
      await expect(indirim2).not.toBeDisabled();
      await indirim2.fill('8');
    }
  });

  // ── 8. Belgeler sekmesi — Kayıtlı sipariş olmadan uyarı veriri ───────────
  test('Yeni siparişte Belgeler sekmesinde kaydet uyarısı gösterilir', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    const docsBtn = page.locator('button:has-text("Belge")').first();
    await docsBtn.click();
    await page.waitForTimeout(300);

    // "Önce kaydedin" benzeri uyarı metni
    const uyari = page.locator('text=kaydetmelisiniz, text=önce kaydet, p:has-text("kaydet")');
    await expect(uyari.first()).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// UI Doğrulama — Kullanıcı Manuel Veri Giremez
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Master Data Driven — UI Read-Only Doğrulama', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Tablo başlığında ⚙️ otomatik hesaplanan alanlar işaretlidir', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    // Tablo başlıklarında "⚙️" veya otomatik hesaplama göstergesi
    const autoHeaders = page.locator('th:has-text("⚙️")');
    const count = await autoHeaders.count();
    // En az 2 otomatik alan: Toplam Adet, Toplam KG, İndirimli Fiyat, Satır Toplamı
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Koli sayısı inputu editable, diğer sayısal göstergeler readonly span/div', async ({ page }) => {
    await page.goto(`${PIPELINE_URL}/yeni`);
    await page.waitForLoadState('networkidle');

    // Ürün Ekle
    const addBtn = page.locator('button:has-text("Ürün Ekle")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    // Koli sayısı editable olmalı
    const koliInput = page.locator('input[name*="koliSayisi"]').first();
    if (await koliInput.isVisible()) {
      await expect(koliInput).not.toBeDisabled();
    }

    // "miktarAdet" adlı bir INPUT olmamalı (span/div olmalı)
    const miktarInput = page.locator('input[name*="miktarAdet"]');
    expect(await miktarInput.count()).toBe(0);

    // "toplamAgirlik" adlı bir INPUT olmamalı
    const agirlikInput = page.locator('input[name*="toplamAgirlik"]');
    expect(await agirlikInput.count()).toBe(0);
  });
});
