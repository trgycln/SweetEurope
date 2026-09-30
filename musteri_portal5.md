- BAĞLAM VE TEST KAPSAMI (CONTEXT):
Hedef: B2B Müşteri Portalı'nda "Siparişi Tamamla" (Checkout) akışının uçtan uca tamamlanması ve "Bildirim aboneliği sağlanamadı" (Web Push Subscription) hatasının giderilmesi.
Mevcut Hatalar:
1. Push Bildirim Hatası: Kullanıcı bildirim izni verdiğinde sistem çökmekte veya "Abonelik sağlanamadı" hatası fırlatmaktadır. Bunun sebebi büyük ihtimalle `.env.local` dosyasında `NEXT_PUBLIC_VAPID_PUBLIC_KEY` eksikliği, Service Worker'ın hazır olmaması veya `/api/push/subscribe` endpoint'indeki bir 500/Auth hatasıdır.
2. Checkout Akışı Eksikliği: Sepet çekmecesi (Cart Drawer) yapıldı ancak "Siparişi Tamamla" butonuna basıldığında siparişin veritabanına yazılması, sepetin temizlenmesi (`clearWarenkorb`), çekmecenin kapanması ve kullanıcının "Siparişlerim" sayfasına yönlendirilmesi adımlarının tam olarak test edilip onaylanması gerekiyor.

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY):
1. Hata Yakalama (Graceful Degradation): Push bildirim aboneliği kritik bir işlev değildir. Eğer VAPID key eksikse veya tarayıcı desteklemiyorsa, sistem hata fırlatıp kullanıcı deneyimini bozmamalı, sessizce (console.warn ile) geçmelidir.
2. Uçtan Uca (E2E) Sipariş Testi: Playwright ile sepetteki ürünün siparişe dönüştürülmesi, LocalStorage'ın sıfırlanması ve `/portal/siparisler` sayfasında yeni siparişin listelenmesi test edilecektir.
3. API ve Client Refactoring: Push API route'u ve Client bileşeni (PushNotificationManager) try-catch blokları ile zırhlanacaktır.

- TEST SENARYOLARI (TEST CASES):
  * Happy Path (Sorunsuz akış):
    - Kullanıcı "Siparişi Tamamla" butonuna basar.
    - Sistem (Server Action veya API) siparişi `siparisler` ve `siparis_detay` tablolarına kaydeder.
    - Başarı mesajı (toast) gösterilir.
    - `clearWarenkorb()` çalışır, sepet ikonu "0" olur.
    - Çekmece kapanır ve kullanıcı `/portal/siparisler` sayfasına yönlendirilir (`router.push`).
    - Siparişlerim sayfasında en üstte yeni sipariş görünür.
  * Negative Path (Hatalı girişler, yetkisiz erişimler):
    - Push bildirim izni verilse bile `.env` dosyasında VAPID key yoksa, ekranda kırmızı hata (toast.error) ÇIKMAMALI, işlem sessizce iptal edilmelidir.
    - Sepet boşken "Siparişi Tamamla" butonu tıklanamaz (disabled) olmalıdır.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS):
  - [ ] Adım 1: Push Bildirim Hatasının Giderilmesi (Client). `src/components/portal/PushNotificationManager.tsx` (veya aboneliği tetikleyen bileşen) dosyasını aç. `pushManager.subscribe` çağrısını ve API'ye yapılan `fetch` isteğini incele. Eğer `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` yoksa, fonksiyonu `return` ile sessizce sonlandır (Kullanıcıya hata gösterme). Try-catch bloğundaki `toast.error` mesajını kaldır veya sadece geliştirme ortamında `console.warn` olarak bırak.
  - [ ] Adım 2: Push Bildirim Hatasının Giderilmesi (Server). `src/app/api/push/subscribe/route.ts` dosyasını kontrol et. Supabase Auth üzerinden `user.id`'yi güvenli şekilde aldığından ve `push_subscriptions` tablosuna doğru formatta insert yaptığından emin ol. Hata durumunda 500 dönse bile uygulamanın çökmemesini sağla.
  - [ ] Adım 3: Checkout (Sipariş Tamamlama) Mantığının Entegrasyonu. `src/components/portal/siparisler/CartDrawer.tsx` dosyasını aç. "Siparişi Tamamla" butonunun `onClick` eventine bir fonksiyon bağla. Bu fonksiyon:
        1. Sepetteki ürünleri alıp ilgili Server Action'a (örn: `createPortalOrderAction`) göndersin.
        2. Başarılı olursa: `clearWarenkorb()` çağrısı yapsın.
        3. `setIsCartOpen(false)` ile çekmeceyi kapatsın.
        4. `toast.success('Siparişiniz başarıyla alındı')` göstersin.
        5. `router.push('/[locale]/portal/siparisler')` ile yönlendirme yapsın.
  - [ ] Adım 4: Playwright Testinin Genişletilmesi. `tests/e2e/portal/customer-journey.spec.ts` dosyasını aç. Testin sonuna şu adımları ekle:
        - Çekmece içindeki "Siparişi Tamamla" butonuna tıkla.
        - Başarı mesajının (toast) çıkmasını bekle.
        - URL'in `/portal/siparisler` olarak değiştiğini doğrula (`await page.waitForURL('**/portal/siparisler')`).
        - Header'daki sepet ikonunun "0" olduğunu doğrula.
        - Siparişlerim tablosunda yeni bir satırın oluştuğunu doğrula.
  - [ ] Adım 5: Testlerin Koşulması. Terminalde `npm run build` al. Başarılı olursa `npm run start` ile sunucuyu başlat ve `npx playwright test tests/e2e/portal/customer-journey.spec.ts --project=chromium` komutunu çalıştırarak tüm sipariş akışının ve push bildirim sessizleştirilmesinin kusursuz çalıştığını kanıtla.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI:
  - GRACEFUL DEGRADATION: Push bildirimleri "Nice-to-have" (olsa iyi olur) bir özelliktir. Çalışmaması durumunda ana iş akışını (sipariş verme, gezinme) KESİNLİKLE bloklamamalı veya kullanıcıyı rahatsız edici hata mesajları göstermemelidir.
  - VERİ BÜTÜNLÜĞÜ: Sipariş oluşturulurken KDV (%7), Kargo ve Net/Brüt toplamlar Server Action tarafında da (güvenlik için) tekrar hesaplanmalı veya client'tan gelen veriler Supabase'e doğru formatta yazılmalıdır.
  - YÖNLENDİRME: Sipariş verildikten sonra kullanıcının boş bir sepet ekranında kalması UX hatasıdır. Mutlaka sipariş takip sayfasına (`/portal/siparisler`) yönlendirilmelidir.