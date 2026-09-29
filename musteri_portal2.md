- BAĞLAM VE TEST KAPSAMI (CONTEXT):
Hedef: `elysonsweets.de` B2B Müşteri Portalı Sepet (Cart) UI/UX Revizyonu ve E2E Test Süreci.
Mevcut Durum ve Hata Tespiti: Kullanıcı manuel testinde kritik bir UX hatası tespit etmiştir. Sepet ikonu işlevsizdir ve sepet içeriği katalog sayfasının (`KatalogClient.tsx`) en altında statik olarak render edilmektedir. Bu durum, kullanıcının sepeti fark etmesini imkansız kılmaktadır.
Kapsam: Sepet UI'ının sayfa altından kaldırılarak, modern e-ticaret standartlarına uygun bir "Sağdan Açılan Çekmece (Right Drawer / Slide-over)" veya "Modal" yapısına dönüştürülmesi. Header'daki sepet ikonunun bu çekmeceyi tetiklemesi. Ardından mevcut `yarn dev` sunucusu üzerinden E2E testlerinin koşulması.

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY):
1. UI/UX Refactoring: Sepet bileşeni sayfa akışından (document flow) koparılıp, `fixed` pozisyonlu bir Drawer bileşenine taşınacaktır.
2. State Management: `PortalContext.tsx` içerisine sepetin açık/kapalı durumunu tutacak `isCartOpen` ve `setIsCartOpen` state'leri eklenecektir.
3. E2E Test Execution: Hızlı iterasyon için testler öncelikle aktif olan `yarn dev` sunucusu üzerinde koşulacaktır.
4. Test Data Preparation: Playwright testlerinin takılmaması için Supabase üzerinde test kullanıcısının (`test_musteri@elysonsweets.de`) varlığı bir script ile garanti altına alınacaktır.

- TEST SENARYOLARI (TEST CASES):
  * Happy Path (Sorunsuz akış):
    - Kullanıcı katalogda "Sepete Ekle" butonuna basar.
    - Header'daki sepet ikonuna tıklar.
    - Ekranın sağından (mobilde tüm ekranı kaplayacak şekilde) Sepet Çekmecesi (Cart Drawer) açılır.
    - Çekmece içindeki ürünler, miktarlar ve toplam fiyat doğru görünür.
    - "Siparişi Tamamla" butonuna basıldığında sipariş başarıyla oluşturulur ve çekmece kapanır.
  * Negative Path (Hatalı girişler, yetkisiz erişimler):
    - Çekmece dışına (backdrop) tıklandığında veya "X" butonuna basıldığında çekmece kapanmalıdır.
    - Sepet boşken çekmece açıldığında "Sepetiniz boş" uyarısı çıkmalı ve sipariş butonu inaktif (disabled) olmalıdır.
  * Edge Cases (Sınır durumlar):
    - Mobil cihazda (375px) çekmece açıldığında arka planın (body) kaydırılması (scroll) engellenmelidir (`overflow: hidden`).

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS):
  - [ ] Adım 1: State Yönetiminin Eklenmesi. `src/contexts/PortalContext.tsx` dosyasını aç. `PortalContextType` arayüzüne `isCartOpen: boolean` ve `setIsCartOpen: (val: boolean) => void` ekle. Provider içinde bu state'i tanımla ve context value olarak dışarı aktar.
  - [ ] Adım 2: Sepet Çekmecesi (Cart Drawer) Bileşeninin Oluşturulması. `src/components/portal/siparisler/CartDrawer.tsx` (veya uygun bir dizin) adında yeni bir bileşen oluştur. Bu bileşen `usePortal` hook'unu kullanarak `isCartOpen` state'ini dinlemeli. Açık olduğunda ekranın sağından kayarak giren (Tailwind: `fixed inset-y-0 right-0 z-[100] w-full md:w-96 bg-white shadow-xl transform transition-transform duration-300`), arka planı karartan (backdrop) bir UI inşa et.
  - [ ] Adım 3: Katalog Sayfasının Temizlenmesi. `src/app/[locale]/portal/katalog/KatalogClient.tsx` (veya sepetin en altta render edildiği ilgili dosya) dosyasını aç. Sayfanın en altındaki statik sepet render kodlarını KESİNLİKLE SİL. Sepet içeriğini ve sipariş tamamlama butonunu yeni oluşturduğun `CartDrawer.tsx` içine taşı.
  - [ ] Adım 4: Header İkonunun Bağlanması. `src/components/portal/PortalHeader.tsx` (veya ilgili header bileşeni) dosyasını aç. Sepet ikonunun `onClick` eventine `setIsCartOpen(true)` fonksiyonunu bağla.
  - [ ] Adım 5: Drawer'ın Layout'a Eklenmesi. `CartDrawer` bileşenini `PortalContainer.tsx` veya portalın ana `layout.tsx` dosyasına ekle ki her sayfada erişilebilir olsun.
  - [ ] Adım 6: Test Kullanıcısının Oluşturulması. `scripts/setup-test-user.mjs` adında kısa bir script yazarak Supabase Admin API ile `test_musteri@elysonsweets.de` (şifre: `password123`) kullanıcısını oluştur ve `firmalar` tablosunda 'Müşteri' statüsünde bir firmaya bağla. Bu scripti çalıştır.
  - [ ] Adım 7: E2E Testlerinin Dev Ortamında Koşulması. Terminalde `npx playwright test tests/e2e/portal/customer-journey.spec.ts --project=chromium` komutunu çalıştırarak (mevcut `yarn dev` sunucusunu hedef alarak) yeni Drawer yapısının ve sipariş akışının mobilde ve masaüstünde kusursuz çalıştığını doğrula.
  - [ ] Adım 8: Hata Çözümü. Testler başarısız olursa, özellikle mobil görünümdeki tıklanabilirlik (pointer-events, z-index) ve scroll kilitlenmesi sorunlarını çözerek testleri tekrar koş.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI:
  - UX STANDARDI: Sepet kesinlikle sayfanın altında statik olarak kalmamalıdır. Modern B2B e-ticaret standartlarına uygun olarak her zaman erişilebilir bir Drawer (Çekmece) veya Modal olmalıdır.
  - MOBİL UYUM: Drawer mobilde (`w-full`) tam ekran, masaüstünde (`md:w-96` veya `md:w-[400px]`) sağda bir panel olmalıdır.
  - TEST ORTAMI: Testleri hızlandırmak için şu an `yarn dev` kullan. Ancak tüm testler yeşil yandıktan sonra, canlıya almadan önce mutlaka production build (`npm run build`) ile son bir kontrol yapılacaktır.
  - KOD SİLME: `KatalogClient.tsx` içindeki eski sepet kodlarını yorum satırına alma, tamamen sil. Temiz kod prensibine uy.