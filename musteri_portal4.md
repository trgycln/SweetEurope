- BAĞLAM VE TEST KAPSAMI (CONTEXT):
Hedef: B2B Müşteri Portalı'nda tespit edilen 4 kritik mantık ve UX hatasının giderilmesi.
Mevcut Hatalar:
1. Dil Varsayılanı: Yeni müşteriler için varsayılan dilin kesin olarak Almanca (DE) olmaması.
2. Sepet Kalıcılığı (Persistence): Sayfa yenilendiğinde (F5) sepetteki ürünlerin kaybolması (State'in sıfırlanması).
3. Rutin Siparişler Mantığı: Hiç siparişi olmayan yeni müşterilere "Sık Aldığınız Ürünler" listesinin (muhtemelen dummy data veya hatalı sorgu ile) gösterilmesi.
4. Sepet Çekmecesi (Cart Drawer) Eksiklikleri: Yeni yapılan yandan açılır sepetin, eski sepetin sahip olduğu B2B hesaplamalarını (Koli/Adet/Palet fiyat kademeleri, KDV, Kargo hesaplaması ve Checkout butonu) içermemesi. Sadece basit bir liste olarak yapılmış olması.
Kapsam: `PortalContext.tsx` içine `localStorage` entegrasyonu, `CartDrawer.tsx` içine eski kapsamlı sepet mantığının taşınması, "Sık Aldığınız Ürünler" bileşenine veri kontrolü eklenmesi ve profil oluşturma/middleware aşamasında 'de' dilinin zorunlu kılınması.

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY):
1. State Persistence: `PortalContext.tsx` içinde sepet verisi `localStorage`'a yazılacak ve sayfa yüklendiğinde (hydration uyarılarına dikkat edilerek `useEffect` içinde) geri okunacak.
2. Component Refactoring: Eski `KatalogClient.tsx` altındaki detaylı sepet (KDV, Kargo, Toplam Brüt/Net, Siparişi Tamamla butonu) kodları birebir `CartDrawer.tsx` içine entegre edilecek.
3. Conditional Rendering: "Sık Aldığınız Ürünler" (Frequent Products) sorgusu, kullanıcının geçmiş sipariş sayısını kontrol edecek. Sipariş yoksa bu bölüm gizlenecek.
4. E2E Test Güncellemesi: Playwright testine "Sayfayı yenile, sepetin hala dolu olduğunu doğrula" adımı eklenecek.

- TEST SENARYOLARI (TEST CASES):
  * Happy Path (Sorunsuz akış):
    - Müşteri sepete 2 koli ürün ekler. Sayfayı yeniler (F5). Sepet ikonundaki sayı ve çekmece içindeki ürünler kaybolmaz.
    - Sepet çekmecesi açıldığında; ürünün koli fiyatı, KDV (%7), Kargo ücreti ve Genel Toplam (Brüt) kuruşu kuruşuna doğru hesaplanmış olarak görünür. "Siparişi Tamamla" butonu aktiftir.
    - Yeni kayıt olmuş bir müşteri portala girdiğinde "Sık Aldığınız Ürünler" bölümünü görmez.
    - Sisteme ilk kez giren kullanıcının arayüzü otomatik olarak Almanca (de) başlar.
  * Negative Path (Hatalı girişler, yetkisiz erişimler):
    - Sepetteki ürün miktarı 0'a düşürüldüğünde ürün sepetten silinir ve `localStorage` güncellenir.
  * Edge Cases (Sınır durumlar):
    - Next.js Hydration Mismatch: Sunucu (SSR) tarafında `localStorage` olmadığı için, sepetin ilk render'da boş gelip client-side'da dolması sırasında UI titremesi (flicker) veya React hydration hatası olmaması için `isMounted` state'i kullanılmalıdır.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS):
  - [ ] Adım 1: Sepet Kalıcılığı (LocalStorage). `src/contexts/PortalContext.tsx` dosyasını aç. `isMounted` adında bir state ekle (`false` ile başlasın, `useEffect` içinde `true` olsun). `warenkorb` state'ini başlatırken veya bir `useEffect` içinde `localStorage.getItem('elyson_b2b_cart')` üzerinden veriyi oku. `warenkorb` her değiştiğinde `localStorage.setItem` ile kaydet. Hydration hatasını önlemek için `isMounted` false ise sepet ikonunda 0 göster.
  - [ ] Adım 2: Kapsamlı Sepet Mantığının Drawer'a Taşınması. `src/components/portal/siparisler/CartDrawer.tsx` dosyasını aç. Eski sepetin sahip olduğu `hesaplaSepetSatiri` (pricingUtils.ts) ve `calculateShipping` (shippingUtils.ts) fonksiyonlarını import et. Çekmece içinde sadece ürün adını değil; Koli/Adet seçimi, Birim Fiyat, Ara Toplam (Net), KDV (%7), Kargo Ücreti ve Genel Toplam (Brüt) değerlerini gösteren tablo/liste yapısını kur. Alt kısma orijinal "Siparişi Tamamla / Ödeme Adımına Geç" butonunu ve fonksiyonunu ekle.
  - [ ] Adım 3: Rutin Siparişler Mantığının Düzeltilmesi. `src/app/[locale]/portal/katalog/KatalogClient.tsx` veya `RecentOrders.tsx` (Sık Aldığınız Ürünler nerede render ediliyorsa) dosyasını aç. Bu listeyi besleyen veriyi kontrol et. Eğer kullanıcının geçmiş siparişi yoksa (veya dönen liste boşsa), bu bölümü `return null` ile tamamen gizle. Dummy data kullanımını kaldır.
  - [ ] Adım 4: Varsayılan Dilin Almanca (DE) Yapılması. `src/middleware.ts` ve profil oluşturma mantığını (örn. `src/app/actions/partner-actions.ts` veya Supabase trigger'ı) kontrol et. Yeni bir profil oluşturulduğunda `tercih_edilen_dil` alanının kesinlikle `'de'` olarak kaydedildiğinden emin ol.
  - [ ] Adım 5: Playwright Testinin Güncellenmesi. `tests/e2e/portal/customer-journey.spec.ts` dosyasını aç. Sepete ürün ekledikten sonra `await page.reload()` komutu ile sayfayı yenile. Yenilemeden sonra sepet ikonuna tıklayıp ürünün hala orada olduğunu ve KDV/Kargo hesaplamalarının göründüğünü `expect` ile doğrula.
  - [ ] Adım 6: Testlerin Koşulması. Terminalde `npm run build` al. Başarılı olursa `npm run start` ile sunucuyu başlat ve `npx playwright test tests/e2e/portal/customer-journey.spec.ts --project=chromium` komutunu çalıştırarak tüm hataların giderildiğini doğrula.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI:
  - HYDRATION UYARISI: Next.js'de `localStorage` kullanırken `Text content did not match. Server: "0" Client: "1"` hatası almamak için sepet sayısını ve içeriğini sadece bileşen mount olduktan (`useEffect` çalıştıktan) sonra render et.
  - B2B FİYATLANDIRMA: `CartDrawer.tsx` içindeki hesaplamalar KESİNLİKLE `pricingUtils.ts` ve `shippingUtils.ts` üzerinden yapılmalıdır. Manuel çarpma/bölme işlemi yapma.
  - DİL ZORUNLULUĞU: Sistemin ana dili Almancadır. Fallback veya tanımsız durumlarda her zaman `de` kullanılmalıdır.