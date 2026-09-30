- BAĞLAM VE TEST KAPSAMI (CONTEXT):
Hedef: B2B Müşteri Portalı'nda yanlış anlaşılan "Yandan Açılan Sepet (Drawer)" mimarisinin tamamen iptal edilip, orijinal tasarıma (sayfanın en altındaki kapsamlı ödeme/sepet alanına) geri dönülmesi ve sepet ikonunun bu alana kaydırma (scroll) işlevi görmesi.
Mevcut Durum: IDE, sepeti yandan açılan bir çekmece (Drawer) yaptı ve eski kodu sildi. Ancak müşteri, sayfanın en altındaki orijinal, ödeme kanallarını da içeren kapsamlı sepet aracını kullanmak istiyor. Çekmece (Drawer) UX açısından kafa karışıklığı yarattı.
Kapsam: 
1. `CartDrawer.tsx` bileşeninin ve `isCartOpen` state'inin tamamen silinmesi.
2. `KatalogClient.tsx` (veya orijinal sepetin bulunduğu sayfa) dosyasının en altındaki orijinal sepet/ödeme alanının Git geçmişinden (veya yeniden yazılarak) geri getirilmesi.
3. Header'daki sepet ikonuna tıklandığında sayfanın en altındaki bu sepet alanına yumuşak bir kaydırma (smooth scroll) yapılması.
4. LocalStorage kalıcılığı ve Push bildirim sessizleştirme (Graceful Degradation) özelliklerinin KORUNMASI.
5. E2E testlerinin bu yeni "Scroll to bottom" akışına göre güncellenmesi.

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY):
1. Kod Geri Alma (Revert & Refactor): Drawer mimarisi tamamen kaldırılacak. Orijinal sepet UI'ı sayfa altına geri eklenecek ve bir `id` (örn: `cart-checkout-section`) verilecek.
2. DOM Manipülasyonu: Header'daki sepet butonu `document.getElementById('cart-checkout-section')?.scrollIntoView({ behavior: 'smooth' })` mantığıyla çalışacak.
3. E2E Test Güncellemesi: Playwright testi, sepet ikonuna tıkladıktan sonra sayfanın altına inildiğini ve orijinal sipariş tamamlama butonuna basıldığını doğrulayacak.

- TEST SENARYOLARI (TEST CASES):
  * Happy Path (Sorunsuz akış):
    - Kullanıcı katalogdan ürünleri sepete ekler.
    - Header'daki sepet ikonuna tıklar.
    - Sayfa otomatik olarak en alta, ödeme ve sepet detaylarının olduğu bölüme kayar (smooth scroll).
    - Kullanıcı bu alanda KDV, Kargo ve ödeme seçeneklerini görür, "Siparişi Tamamla" butonuna basar.
    - Sipariş başarıyla oluşturulur, sepet (LocalStorage dahil) temizlenir ve `/portal/siparisler` sayfasına yönlendirilir.
  * Negative Path (Hatalı girişler, yetkisiz erişimler):
    - Sepet boşken sayfa altındaki sipariş tamamlama butonu inaktif (disabled) olmalıdır.
  * Edge Cases (Sınır durumlar):
    - Mobil cihazda (375px) sepet ikonuna tıklandığında scroll işleminin doğru hesaplanması ve hedefin tam ekranda görünür olması.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS):
  - [ ] Adım 1: Drawer Mimarisinin Silinmesi. `src/components/portal/siparisler/CartDrawer.tsx` dosyasını tamamen SİL. `src/contexts/PortalContext.tsx` içindeki `isCartOpen` ve `setIsCartOpen` state'lerini ve tiplerini SİL (Ancak `localStorage` kalıcılığını sağlayan `isMounted` ve `useEffect` kodlarını KESİNLİKLE KORU). `PortalContainer.tsx` içindeki `CartDrawer` importunu ve bileşenini kaldır.
  - [ ] Adım 2: Orijinal Sepet Alanının Geri Getirilmesi. `src/app/[locale]/portal/katalog/KatalogClient.tsx` dosyasını aç. Sayfanın en altına, daha önce sildiğin kapsamlı sepet ve ödeme alanını (KDV, Kargo, Brüt hesaplamaları ve Siparişi Tamamla butonu dahil) geri ekle. Bu alanı kapsayan en dış `div` elemanına `id="cart-checkout-section"` özelliğini ekle.
  - [ ] Adım 3: Header İkonunun Scroll İşlevine Çevrilmesi. `src/components/portal/PortalHeader.tsx` (veya ilgili header bileşeni) dosyasını aç. Sepet ikonunu saran butonun `onClick` eventini şu şekilde değiştir: `document.getElementById('cart-checkout-section')?.scrollIntoView({ behavior: 'smooth' })`.
  - [ ] Adım 4: Playwright Testinin Güncellenmesi. `tests/e2e/portal/customer-journey.spec.ts` dosyasını aç. Drawer açılmasını bekleyen kodları sil. Yerine: Sepet ikonuna tıkla, sayfanın altına kaymasını bekle, `id="cart-checkout-section"` içindeki "Siparişi Tamamla" butonuna tıkla ve siparişin başarıyla oluşup yönlendirildiğini doğrula.
  - [ ] Adım 5: Testlerin Koşulması. Terminalde `npm run build` al. Başarılı olursa `npm run start` ile sunucuyu başlat ve `npx playwright test tests/e2e/portal/customer-journey.spec.ts --project=chromium` komutunu çalıştırarak yeni "Scroll" akışının kusursuz çalıştığını kanıtla.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI:
  - YENİ SEPET YAPMA: Müşterinin talebi çok nettir. Ayrı bir sepet (Drawer, Modal veya ayrı sayfa) İSTENMİYOR. Sadece sayfanın altındaki mevcut alan kullanılacak.
  - KOD KORUMASI: Önceki adımlarda başarıyla çözülen "Push Bildirimlerinin Sessizleştirilmesi (Graceful Degradation)" ve "LocalStorage Sepet Kalıcılığı" kodlarına KESİNLİKLE DOKUNMA, onlar olduğu gibi kalmalı.
  - UX STANDARDI: Scroll işlemi aniden (jump) olmamalı, `behavior: 'smooth'` kullanılarak kullanıcının sayfanın altına indiğini hissetmesi sağlanmalıdır.