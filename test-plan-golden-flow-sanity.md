- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-golden-flow-sanity.md`

Hedef Modül: "Golden Flow" (Kusursuz Ana Akış) Uçtan Uca Entegrasyonu, Veritabanı Tetikleyicileri (Triggers) ve SEO/GEO Bütünlüğü.
Kapsam: Tüm bireysel modüllerin (Güvenlik, DSGVO, Fiyatlandırma, AI) başarıyla test edilmesinin ardından, canlı lansman öncesi sistemin bir bütün olarak (Public -> Admin -> Portal -> Muhasebe) kesintisiz çalışıp çalışmadığının test edilmesi. Ayrıca `receteler.md` ve `header.md` dosyalarında belirtilen SEO/GEO (Generative Engine Optimization) mimarisinin ve veritabanı trigger'larının (örn: stok tükenme tarihi) doğrulanması.
İlişkili Kritik Dosyalar:
- `supabase/migrations/20260816_otomatik_tedarik_turu.sql` (Stok tükenme trigger'ı)
- `src/lib/seo-utils.ts` (Çoklu dil SEO etiketleri)
- `src/app/[locale]/recipes/page.tsx` (Reçete Sihirbazı görünürlüğü)
- Tüm E2E ve API akışları.

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Full E2E Integration Testing (Playwright): Bir ziyaretçinin siteye girmesinden, faturasının kesilmesine kadar olan tüm yaşam döngüsünün (Customer Lifecycle) tek bir kesintisiz senaryoda test edilmesi.
2. Database Trigger Testing (Vitest): Supabase üzerinde çalışan otomatik fonksiyonların (Trigger) uygulama mantığıyla çelişmediğinin doğrulanması.
3. SEO/GEO Sanity Checks (Playwright/Vitest): Arama motoru botları ve AI botları (ChatGPT, Perplexity) için kritik olan meta etiketlerin ve sayfa yapılarının doğrulanması.

- TEST SENARYOLARI (TEST CASES)

* Happy Path 1: The Golden Flow (Kusursuz Ana Akış)
1. Ziyaretçi (Anonim) siteye girer, "Reçete Sihirbazı"nı kullanır ve B2B portalına kayıt (Waitlist/Register) olur.
2. Admin, panele girer ve bu yeni kaydı "Müşteri" statüsüne alıp onaylar.
3. Müşteri, portal üzerinden giriş yapar, sepetine ürün ekler ve siparişi tamamlar.
4. Admin, sipariş paneline düşen bu siparişi onaylar ve "Fatura Kes" (Lexware) işlemini tetikler.
5. Beklenen Sonuç: Hiçbir adımda yetki hatası, RLS engeli veya API çökmesi yaşanmamalı; sipariş durumu başarıyla "Teslim Edildi" ve fatura durumu "Kesildi" olmalıdır.

* Edge Case 2: Veritabanı Trigger Bütünlüğü (Stok Tükenme Tarihi)
1. Bir ürünün `stok_miktari` değeri bir sipariş veya admin müdahalesi ile `0`'a düşürülür.
2. Beklenen Sonuç: `trg_urunler_stok_tukenme` trigger'ı anında devreye girmeli ve `stok_tukenme_tarihi` kolonuna o anın tarihini (NOW) atmalıdır.
3. Ürüne tekrar stok eklendiğinde (örn: İthalat Partisi onayı ile), `stok_tukenme_tarihi` otomatik olarak `NULL` değerine dönmelidir.

* Edge Case 3: SEO/GEO ve i18n Bütünlüğü
1. Sitenin herhangi bir public sayfasına (örn: `/de/recipes`) istek atılır.
2. Beklenen Sonuç: Sayfanın `<head>` kısmında `x-default` etiketinin `/de/recipes` adresini gösterdiği, `tr`, `en`, `ar` için doğru `alternate` hreflang etiketlerinin bulunduğu doğrulanmalıdır. Ayrıca Reçete Sihirbazı (Recipe Wizard) bileşeninin sayfanın en üstünde (Above the fold) render edildiği DOM üzerinden kanıtlanmalıdır.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: `tests/e2e/golden-flow.spec.ts` dosyasını oluştur. Playwright ile Ziyaretçi -> Admin Onayı -> Müşteri Siparişi -> Admin Fatura Kesimi adımlarını tek bir test senaryosu (veya birbirine bağlı adımlar) halinde kodla.
- [ ] Adım 2: `__tests__/database-triggers.test.ts` dosyasını oluştur. Supabase client kullanarak bir ürünün stokunu 0'a çek, `stok_tukenme_tarihi`nin atandığını `expect` ile doğrula. Ardından stoku 10 yap ve tarihin `null` olduğunu doğrula.
- [ ] Adım 3: `tests/e2e/seo-geo-sanity.spec.ts` dosyasını oluştur. Playwright ile `/de/recipes` sayfasına git, `<link rel="alternate" hreflang="...">` etiketlerinin varlığını ve `x-default` değerinin doğruluğunu test et.
- [ ] Adım 4: Testleri çalıştır (`npm run test` ve `npm run test:e2e`).
- [ ] Adım 5: Golden Flow testi sırasında e-posta gönderimlerinin (Resend) test ortamında gerçek e-posta atmadığından (mocklandığından) emin ol.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. E2E TEST İZOLASYONU: Golden Flow testi, veritabanında kalıcı "çöp" veri bırakmamalıdır. Testin `afterAll` veya `teardown` aşamasında, oluşturulan test müşterisi, test siparişi ve test faturası (Lexware mock) temizlenmelidir.
2. GERÇEK E-POSTA YASAĞI: E2E testleri sırasında `sendCustomerEmail` veya `sendAdminEmail` fonksiyonları kesinlikle gerçek API'ye istek atmamalı, Playwright tarafında network intercept (route.abort/route.fulfill) veya Vitest tarafında `vi.mock` ile engellenmelidir.
3. SEO/GEO KURALI: `receteler.md` dosyasında belirtildiği üzere, UI'da kesinlikle "AI" veya "Yapay Zeka" kelimeleri aranmamalı, testler "Reçete Sihirbazı" veya "Rezept-Assistent" metinlerinin varlığını doğrulamalıdır.