- BAĞLAM VE TEST KAPSAMI (CONTEXT):
Hedef: `elysonsweets.de` B2B Müşteri Portalı (`/portal/*` rotaları).
Kapsam: Müşterinin sisteme giriş yapmasından, katalogda gezinmesine, ürünleri sepete eklemesine, sepeti görüntülemesine (özellikle mobilde tıklanamama sorunu), siparişi tamamlamasına, ödeme/fatura adımlarına ve Web Push (Anlık Bildirim) abonelik sürecine kadar olan tüm uçtan uca (E2E) akış.
Mevcut Hatalar: 
1. Sepet ikonuna tıklanamaması / sepetin açılamaması (Özellikle mobil görünümde z-index, eksik `href` veya overlay çakışması şüphesi).
2. Web Push bildirimlerine izin verilmesine rağmen "Abonelik sağlanamadı" hatası (VAPID key eksikliği, Service Worker kayıt hatası veya `/api/push/subscribe` endpoint'indeki RLS/Auth sorunları şüphesi).

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY):
1. Statik Analiz ve UI Onarımı: Playwright testleri yazılmadan önce, `NavbarElegant.tsx`, `Header.tsx` veya `MobileMenu.tsx` içindeki sepet butonu DOM yapısı incelenip onarılacaktır. Aynı şekilde Push API endpoint'i kontrol edilecektir.
2. E2E (Uçtan Uca) Testler: `Playwright` kullanılarak hem Masaüstü (Chromium) hem de Mobil (Mobile Safari/Chrome) cihaz emülasyonları ile gerçek kullanıcı senaryoları simüle edilecektir.
3. Birim Testleri (Unit Tests): `Vitest` kullanılarak `PortalContext.tsx` içindeki sepet mantığı ve `pricingUtils.ts` içindeki B2B fiyat hesaplamaları test edilecektir.
4. Ortam: Testler lokalde çalıştırılacak ancak Vercel/Production ortamını simüle edecek şekilde (Next.js build & start) koşulacaktır.

- TEST SENARYOLARI (TEST CASES):
  * Happy Path (Sorunsuz akış):
    - Müşteri başarılı şekilde login olur ve `/portal/dashboard` sayfasına yönlendirilir.
    - Katalogdan bir ürünü (örn: FO Şurup) sepete ekler.
    - Sepet ikonuna (mobilde ve masaüstünde) tıklar, sepet sayfası/çekmecesi (drawer) sorunsuz açılır.
    - Sipariş onayı verilir, veritabanında `siparisler` ve `siparis_detay` tablolarına doğru fiyatlar (Net, KDV, Kargo) ile kayıt atılır.
    - Sipariş sonrası "Siparişlerim" sayfasında yeni sipariş "Beklemede" veya "Taslak" statüsünde görünür.
    - Kullanıcı bildirim izni verir, Supabase `push_subscriptions` tablosuna kayıt başarılı şekilde atılır.
  * Negative Path (Hatalı girişler, yetkisiz erişimler):
    - Sepet boşken ödeme (checkout) sayfasına gidilmeye çalışılması (engellenmeli).
    - Müşteri rolündeki kullanıcının `/admin` rotalarına erişmeye çalışması (middleware ile engellenmeli).
    - Push bildirim izni reddedildiğinde uygulamanın çökmemesi ve sessizce (graceful degradation) çalışmaya devam etmesi.
  * Edge Cases (Sınır durumlar):
    - Sepete `stok_miktari` değerinden fazla ürün eklenmeye çalışılması (PortalContext içindeki uyarı tetiklenmeli).
    - Mobil cihazda (375px genişlik) sepet ikonunun üzerine başka bir görünmez div'in (z-index sorunu) binip binmediğinin tespiti.
    - Koli ve Palet bazlı alımlarda fiyat kademelerinin (Tier Pricing) kuruşu kuruşuna doğru hesaplanması (virgül/nokta yuvarlama hataları).

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS):
  - [ ] Adım 1: Sepet UI/UX Hata Tespiti ve Onarımı. `src/components/NavbarElegant.tsx`, `Header.tsx` ve mobil menü bileşenlerini aç. Sepet ikonunun bir `<Link href="/[locale]/portal/sepet">` veya `onClick` eventine sahip bir `<button>` olduğundan emin ol. Mobil görünümde `z-index` veya `pointer-events-none` gibi tıklamayı engelleyen CSS hatalarını düzelt.
  - [ ] Adım 2: Push Bildirim Hatası Onarımı. `src/app/api/push/subscribe/route.ts` dosyasını ve `PushNotificationManager.tsx` bileşenini incele. Supabase Auth token'ının API'ye doğru iletildiğinden ve `push_subscriptions` tablosundaki RLS politikalarının (kullanıcının kendi ID'si ile kayıt atabilmesi) çalıştığından emin ol. VAPID key kontrollerini try-catch blokları ile güvenli hale getir.
  - [ ] Adım 3: Playwright E2E Test Dosyasının Oluşturulması. `tests/e2e/portal/customer-journey.spec.ts` dosyasını oluştur. İçerisine şu testleri yaz:
        1. Mobil cihaz emülasyonu ile login olma.
        2. Katalogdan sepete ürün ekleme.
        3. Sepet ikonuna tıklama (Tıklanabilirliği `toBeVisible` ve `toBeEnabled` ile zorla test et).
        4. Checkout işlemini tamamlama.
  - [ ] Adım 4: Playwright Push Notification Testi. Aynı dosyaya, tarayıcı izinlerini (permissions: ['notifications']) mock'layarak Push abonelik akışının API'den 200 OK dönüp dönmediğini test eden bir blok ekle.
  - [ ] Adım 5: Vitest Birim Testlerinin Yazılması. `src/contexts/__tests__/PortalContext.test.tsx` dosyasını oluştur. `addToWarenkorb` fonksiyonunun stok sınırlarını aşıp aşmadığını ve fiyatları doğru hesapladığını test et.
  - [ ] Adım 6: Testlerin Koşulması. Terminalde `npm run build` ve ardından `npm run start` ile production simülasyonunu başlat. Başka bir terminalde `npx playwright test tests/e2e/portal/customer-journey.spec.ts --project=chromium` komutunu çalıştır.
  - [ ] Adım 7: Hata Çözümü. Playwright testleri sepetin açılamadığını veya siparişin tamamlanamadığını raporlarsa, ilgili sayfalardaki (örn: `SiparisDetayClient.tsx` veya sepet sayfası) mantıksal hataları düzelt ve testler yeşil (pass) olana kadar döngüyü tekrarla.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI:
  - MEVCUT VERİTABANINI BOZMA: Playwright testlerinde gerçek Stripe API'sine istek atma. Stripe test anahtarlarını kullan veya ödeme adımını mock'la.
  - TEST KULLANICISI KULLAN: Testler için Supabase'de `test_musteri@elysonsweets.de` gibi izole bir kullanıcı oluştur. Gerçek müşteri verileri üzerinde test yapma.
  - MOBİL ÖNCELİKLİ TEST: Müşterinin yaşadığı sorun mobilde olduğu için, Playwright testlerinde `viewport: { width: 375, height: 812 }` (iPhone X/12) ayarını kesinlikle kullan.
  - FİYAT HESAPLAMALARI: B2B sisteminde KDV (%7) ve Net fiyat ayrımları kritiktir. Testlerde sepet toplamının `(Net * 1.07) + Kargo` formülüne kuruşu kuruşuna uyduğunu `expect` ile doğrula.