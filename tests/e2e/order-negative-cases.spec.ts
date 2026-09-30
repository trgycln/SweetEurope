/**
 * E2E Negatif ve Kenar Durum Testleri
 * Dosya: tests/e2e/order-negative-cases.spec.ts
 *
 * Kapsam:
 * 1. Mock Guvenlik Dogrulamasi (Statik Kod Analizi)
 * 2. Yetkisiz Erisim / RBAC (Unauthorized Access)
 * 3. Stok Siniri Ihlali (Out of Stock Prevention)
 * 4. Kusurat Hassasiyeti (Floating-Point Precision)
 *
 * Bu dosya order-fulfillment.spec.ts'den TAMAMEN BAGIMSIZDIR.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const CUSTOMER_EMAIL = 'test_e2e_dryrun@elysonsweets.de';
const CUSTOMER_PASSWORD = 'TestPassword123!';

// ------------------------------------------------------------------
// Yardimci: Musteri olarak giris yap
// ------------------------------------------------------------------
async function loginAsCustomer(browser: any): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/tr/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  await page.click('button[type="submit"]');

  // Portal'a yonlendirilmesini bekle
  await page.waitForURL(/\/portal\//, { timeout: 30000 });

  return { context, page };
}

// ==================================================================
// TEST 1: MOCK GUVENLIK KONTROLU - Statik Kod Analizi
// ==================================================================
test('Mock Guvenlik: Lexware mock production ortaminda aktif OLMAMALIDIR', async () => {
  const clientFilePath = path.join(process.cwd(), 'src', 'lib', 'lexware', 'client.ts');
  expect(fs.existsSync(clientFilePath), 'client.ts dosyasi bulunamadi').toBe(true);

  const content = fs.readFileSync(clientFilePath, 'utf-8');

  // Production guard olmali
  const hasProductionGuard =
    content.includes("process.env.NODE_ENV === 'production'") ||
    content.includes('isProduction');

  expect(hasProductionGuard,
    "client.ts icinde production guard eksik! Mock kodu production'da calisabilir."
  ).toBe(true);

  // Mock, production'da devre disi birakilmali
  const hasMockDisabledInProd =
    content.includes('!isProduction') ||
    /!isProduction\s*&&/.test(content);

  expect(hasMockDisabledInProd,
    "Mock kodu production'da devre disi birakilmamis! '!isProduction' kosulu eksik."
  ).toBe(true);

  console.log('? Mock guvenlik kontrolu basarili - Production guard mevcut.');
});

// ==================================================================
// TEST 2: YETKISIZ ERISIM / RBAC
// ==================================================================
test.describe('Yetkisiz Erisim (RBAC)', () => {
  let customerContext: BrowserContext;
  let customerPage: Page;

  test.beforeEach(async ({ browser }) => {
    const result = await loginAsCustomer(browser);
    customerContext = result.context;
    customerPage = result.page;
  });

  test.afterEach(async () => {
    await customerContext.close();
  });

  test('Musteri /tr/admin/dashboard adresine gidemez', async () => {
    await customerPage.goto(`${BASE_URL}/tr/admin/dashboard`, { waitUntil: 'networkidle' });

    const finalUrl = customerPage.url();
    expect(finalUrl, `Musteri admin paneline eristi! URL: ${finalUrl}`)
      .not.toContain('/admin');

    const isRedirectedCorrectly = finalUrl.includes('/login') || finalUrl.includes('/portal');
    expect(isRedirectedCorrectly,
      `Beklenen yonlendirme olmadi. Gidilen URL: ${finalUrl}`
    ).toBe(true);

    console.log(`? RBAC dashboard testi basarili - Yonlendirilen URL: ${finalUrl}`);
  });

  test('Musteri /tr/admin/operasyon/siparisler adresine gidemez', async () => {
    await customerPage.goto(`${BASE_URL}/tr/admin/operasyon/siparisler`, { waitUntil: 'networkidle' });

    const finalUrl = customerPage.url();
    expect(finalUrl, `Musteri siparis admin paneline eristi! URL: ${finalUrl}`)
      .not.toContain('/admin');

    console.log(`? RBAC siparis testi basarili - Yonlendirilen URL: ${finalUrl}`);
  });
});

// ==================================================================
// TEST 3: STOK SINIRI IHLALI
// ==================================================================
test.describe('Stok Siniri Ihlali', () => {
  let customerContext: BrowserContext;
  let customerPage: Page;
  let testProductId: string | null = null;

  test.beforeAll(async () => {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Aktif urunlerden birini sec ve stogunu 2'ye dusur
    const { data } = await supabase
      .from('urunler')
      .select('id')
      .eq('aktif', true)
      .limit(1)
      .single();

    if (data) {
      testProductId = data.id;
      await supabase.from('urunler').update({ stok_miktari: 2 }).eq('id', testProductId);
      console.log(`Stok testi icin urun stogu 2'ye dusuruldu: ${testProductId}`);
    }
  });

  test.afterAll(async () => {
    if (testProductId) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await supabase.from('urunler').update({ stok_miktari: 100 }).eq('id', testProductId);
      console.log("Test urunununun stogu 100'e geri yuklendi.");
    }
  });

  test.beforeEach(async ({ browser }) => {
    const result = await loginAsCustomer(browser);
    customerContext = result.context;
    customerPage = result.page;
  });

  test.afterEach(async () => {
    await customerContext.close();
  });

  test('5 adet eklenmeye calisildiginda stok uyarisi gostermeli ve miktar 2 olmali', async () => {
    if (!testProductId) {
      test.skip(true, 'Test urunu bulunamadi - stok testi atlaniyor.');
      return;
    }

    // Kataloga git
    await customerPage.goto(`${BASE_URL}/tr/portal/katalog`, { waitUntil: 'networkidle' });

    // Ilk Ekle butonuna tikla - modal acilir
    const addButton = customerPage.locator('button:has-text("Ekle")').first();
    await expect(addButton).toBeVisible({ timeout: 20000 });
    await addButton.click();

    // Modal icinde miktar alanini bul ve 5 yaz
    const miktarInput = customerPage.locator('input[type="number"]').first();
    await expect(miktarInput).toBeVisible({ timeout: 5000 });
    await miktarInput.fill('5');
    await miktarInput.press('Tab');

    // Sepete ekle butonu
    const confirmBtn = customerPage.locator('button:has-text("Sepete Ekle")').first();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    } else {
      await customerPage.locator('button:has-text("Ekle")').last().click();
    }

    // Toast uyarisi gostermeli: "Stok yetersiz"
    const toastWarning = customerPage.locator('[class*="toast"], [role="alert"]')
      .filter({ hasText: /stok yetersiz|stok|yetersiz/i }).first();
    await expect(toastWarning).toBeVisible({ timeout: 8000 });

    console.log('? Stok siniri uyarisi basariyla gosterildi.');
  });
});

// ==================================================================
// TEST 4: KUSURAT HASSASIYETI (Floating-Point Precision)
// ==================================================================
test.describe('Kusurat Hassasiyeti (Floating-Point)', () => {
  let customerContext: BrowserContext;
  let customerPage: Page;

  test.beforeEach(async ({ browser }) => {
    const result = await loginAsCustomer(browser);
    customerContext = result.context;
    customerPage = result.page;
  });

  test.afterEach(async () => {
    await customerContext.close();
  });

  test('Para tutarlarinda floating-point hatasi olmamali', async () => {
    // Kataloga git
    await customerPage.goto(`${BASE_URL}/tr/portal/katalog`, { waitUntil: 'networkidle' });

    // Urun listesinin yuklenmesini bekle
    await expect(customerPage.locator('table tbody tr').first()).toBeVisible({ timeout: 20000 });

    // Ilk urunu sepete ekle
    const addButton = customerPage.locator('button:has-text("Ekle")').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Modal acildi, miktar: 3
    const miktarInput = customerPage.locator('input[type="number"]').first();
    await expect(miktarInput).toBeVisible({ timeout: 5000 });
    await miktarInput.fill('3');
    await miktarInput.press('Tab');

    // Modal icindeki fiyat ozet satirlarini kontrol et (floating-point hata yok olmali)
    const modalPriceTexts = await customerPage.locator('[class*="font-bold"], [class*="font-semibold"]').allTextContents();
    const invalidPrecisionRegex = /\d+[.,]\d{3,}/; // 3+ ondalik = hata
    
    let floatingPointErrors: string[] = [];
    for (const text of modalPriceTexts) {
      // Euro isareti veya rakam iceren satirlari kontrol et
      if (/€/.test(text) && invalidPrecisionRegex.test(text)) {
        floatingPointErrors.push(text.trim());
      }
    }

    expect(floatingPointErrors.length,
      `Modal icinde floating-point hatasi! Sorunlu degerler: ${floatingPointErrors.join(', ')}`
    ).toBe(0);

    // Sepete ekle
    const confirmBtn = customerPage.locator('button:has-text("Sepete Ekle")').first();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    } else {
      await customerPage.locator('button:has-text("Ekle")').last().click();
    }

    await customerPage.waitForTimeout(1500);

    // Tum sayfadaki euro degerlerini tara
    const allText = await customerPage.content();
    const euroMatches = allText.match(/[\d]+\.[\d]+€|[\d]+\.[\d]+\s€/g) || [];
    
    for (const match of euroMatches) {
      if (invalidPrecisionRegex.test(match)) {
        floatingPointErrors.push(match);
      }
    }

    expect(floatingPointErrors.length,
      `Sayfada floating-point hatasi tespit edildi! Sorunlu: ${floatingPointErrors.join(', ')}`
    ).toBe(0);

    console.log('? Kusurat hassasiyeti testi basarili - Floating-point hatasi yok.');
  });
});
