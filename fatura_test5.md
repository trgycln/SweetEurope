# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Bu yönerge, Müşteri Portalı sepet/ödeme alanında (sayfa altındaki `cart-checkout-section`) eksik olan **Ödeme Yöntemi Seçimi (Stripe Kredi Kartı / Havale-Vorkasse)** UI bileşenlerinin ve Stripe Checkout yönlendirme mantığının sisteme geri kazandırılması amacıyla hazırlanmıştır.

**Kapsanan Modüller:**
- **Sepet UI (`KatalogClient.tsx` veya ilgili sepet bileşeni):** "Siparişi Tamamla" butonundan önce kullanıcıya ödeme yöntemi seçtiren Radio Button / Select yapısı.
- **Sipariş Server Action:** Seçilen ödeme yöntemine göre siparişi veritabanına kaydetme ve Stripe seçildiyse `stripe.checkout.sessions.create` ile ödeme linki üretip client'a dönme.
- **E2E Testleri:** `order-fulfillment.spec.ts` testinin, siparişi tamamlamadan önce "Havale (Vorkasse)" seçeneğini seçecek şekilde güncellenmesi.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **UI/UX:** Sepet toplamının hemen üstüne "Zahlungsmethode" (Ödeme Yöntemi) alanı eklenecektir. İki seçenek olacak: "Vorkasse (Überweisung)" ve "Kreditkarte / Apple Pay (Stripe)".
- **İş Mantığı (Business Logic):** 
  - Kullanıcı "Vorkasse" seçerse: Mevcut akış çalışır, sipariş `Beklemede` olarak kaydedilir, e-posta atılır ve `/portal/siparisler` sayfasına yönlendirilir.
  - Kullanıcı "Stripe" seçerse: Sipariş `Ödeme Bekliyor` (veya Taslak) olarak kaydedilir. Server Action bir Stripe Checkout URL'si döner. Client `window.location.href = stripeUrl` ile kullanıcıyı güvenli ödeme sayfasına yönlendirir.
- **Test Stratejisi:** E2E testlerinde gerçek kredi kartı işlemi yapmamak için, test senaryosu "Vorkasse" seçeneğini işaretleyerek ilerleyecek şekilde güncellenecektir.

---

# TEST SENARYOLARI (TEST CASES)

### 1. Happy Path: Havale (Vorkasse) ile Sipariş
- Kullanıcı sepete ürün ekler.
- Ödeme yöntemi olarak "Vorkasse (Überweisung)" seçer.
- "Siparişi Tamamla" butonuna basar.
- *Beklenti:* Sipariş başarıyla oluşturulur, sepet temizlenir ve `/portal/siparisler` sayfasına yönlendirilir.

### 2. Happy Path: Stripe ile Sipariş Başlatma
- Kullanıcı sepete ürün ekler.
- Ödeme yöntemi olarak "Kreditkarte / Apple Pay" seçer.
- "Siparişi Tamamla" butonuna basar.
- *Beklenti:* Sipariş veritabanına kaydedilir ve kullanıcı `https://checkout.stripe.com/...` adresine yönlendirilir.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Sepet UI'ına Ödeme Seçeneklerinin Eklenmesi**
  - `src/app/[locale]/portal/katalog/KatalogClient.tsx` (veya sepetin bulunduğu sayfa altı bileşeni) dosyasını aç.
  - `paymentMethod` adında bir state oluştur (varsayılan: `'vorkasse'`).
  - Genel Toplam (Brüt) satırının altına, kullanıcının "Vorkasse" veya "Stripe" seçebileceği şık bir Radio Group veya Select menüsü ekle.

- [ ] **Adım 2: Stripe Checkout Server Action'ının Yazılması/Güncellenmesi**
  - Siparişi oluşturan Server Action'ı (örn: `createPortalOrderAction`) bul veya yeni bir tane yaz.
  - Parametre olarak `paymentMethod` alsın.
  - Sipariş veritabanına kaydedildikten sonra;
    - Eğer `paymentMethod === 'stripe'` ise: `src/lib/stripe.ts` kullanarak bir `stripe.checkout.sessions.create` çağrısı yap. `line_items` içine sepet toplamını ekle. `success_url` olarak `/portal/siparisler?payment=success`, `cancel_url` olarak `/portal/katalog?payment=cancelled` ayarla. Oluşan `session.url` değerini client'a dön.
    - Eğer `paymentMethod === 'vorkasse'` ise: Sadece `{ success: true, orderId: ... }` dön.

- [ ] **Adım 3: Client-Side Yönlendirme Mantığının Kurulması**
  - "Siparişi Tamamla" butonunun `onClick` fonksiyonunu güncelle.
  - Server Action'dan dönen yanıtta `stripeUrl` varsa: `clearWarenkorb()` yap ve `window.location.href = response.stripeUrl` ile kullanıcıyı Stripe'a gönder.
  - Yoksa (Vorkasse ise): Mevcut `/portal/siparisler` yönlendirmesini yap.

- [ ] **Adım 4: E2E Testlerinin Güncellenmesi**
  - `tests/e2e/order-fulfillment.spec.ts` dosyasını aç.
  - Siparişi tamamlama adımından hemen önce, eklenen Ödeme Yöntemi alanından "Vorkasse" (veya ilgili label) seçeneğine tıklandığını (`page.locator(...).click()`) garanti altına al.
  - Testi çalıştırarak (`npx playwright test tests/e2e/order-fulfillment.spec.ts`) Vorkasse akışının bozulmadığını doğrula.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **SİPARİŞ KAYBI ÖNLEMESİ:** Stripe seçildiğinde, kullanıcı Stripe sayfasına yönlendirilmeden ÖNCE sipariş mutlaka veritabanına kaydedilmelidir. Kullanıcı ödemeden vazgeçip geri dönerse sipariş "Ödeme Bekliyor" veya "İptal" statüsünde sistemde kalmalıdır; sepet verisi kaybolmamalıdır.
2. **STRIPE GÜVENLİĞİ:** `stripe.checkout.sessions.create` işlemi KESİNLİKLE Server Action veya API Route içinde (sunucu tarafında) yapılmalıdır. Client tarafında Stripe Secret Key kullanılmamalıdır.
3. **TEST İZOLASYONU:** E2E testlerinde Stripe akışını test etmeye çalışma, bu dış servise bağımlılık yaratır ve testleri kırılgan (flaky) yapar. Testler her zaman "Vorkasse" üzerinden ilerlemelidir.