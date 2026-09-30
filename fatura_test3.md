# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Bu test planı, `www.elysonsweets.de` projesi için "Uçtan Uca (E2E) Sipariş ve Teslimat İş Akışı"nın (Dry Run Simülasyonu) kaynak kod haritasına (repomix-output.xml) uygun olarak sıfırdan otomatikleştirilmesi, test edilmesi ve onarılması amacıyla oluşturulmuştur.

**Kapsanan Modüller:**
- **Müşteri Portalı (B2B):** Oturum açma, sepet yönetimi (LocalStorage tabanlı `elyson_b2b_cart`), "Havale (Vorkasse)" ile sipariş oluşturma, sipariş detayında fatura ve kargo takibi görüntüleme.
- **Admin Paneli:** Sipariş yönetimi, ödeme onayı, Lexware entegrasyonu ile fatura kesimi (`lexware_invoice_id`, `fatura_durumu`), kargo yönetimi (`kargo_firmasi`, `kargo_takip_no`).
- **Bildirim Sistemi:** Resend üzerinden Fatura (PDF ekli) ve Kargo takip linki içeren e-posta gönderim tetikleyicileri.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **Test Türü:** Uçtan Uca (End-to-End / E2E) Test.
- **Araç:** Playwright (Multi-context desteği ile Müşteri ve Admin oturumları eşzamanlı simüle edilecektir).
- **Veritabanı Stratejisi (Docker/Local DB İptali):** Önceki hataları aşmak için testler **Uzak (Remote/Staging) Supabase** üzerinde koşulacaktır. RLS (Row Level Security) engellerine takılmamak için test kullanıcısı ve firması `SUPABASE_SERVICE_ROLE_KEY` kullanılarak `setup.ts` içinde oluşturulacak ve test bitiminde `teardown.ts` ile temizlenecektir. Mevcut RLS politikalarına KESİNLİKLE dokunulmayacaktır.
- **Mocking & Stubbing (Dış Servis İzolasyonu):** 
  - **Lexware API:** `https://api.lexware.io/*` istekleri Playwright `context.route()` ile intercept edilecek. Fatura oluşturma ve PDF indirme isteklerine sahte (mock) başarılı yanıtlar dönülecek.
  - **Resend API:** `https://api.resend.com/*` istekleri intercept edilerek e-postaların gerçekten gitmesi engellenecek, ancak payload içinde PDF ekinin ve kargo linkinin varlığı doğrulanacak (assert).

---

# TEST SENARYOLARI (TEST CASES)

### 1. Happy Path (Sorunsuz Akış - Ana Hedef)
- **Müşteri Akışı:** Test müşterisi portala giriş yapar. Katalogdan 1 ürün sepete eklenir. Çekmece/Sepet alanından "Havale (Vorkasse)" seçilerek sipariş tamamlanır. Sipariş ID'si kaydedilir.
- **Admin Akışı:** Admin hesabıyla panele girilir. İlgili sipariş bulunur. "Ödeme Alındı Olarak İşaretle & Fatura Kes" butonuna basılır.
  - *Beklenti:* Lexware API mock'u tetiklenmeli, siparişin `fatura_durumu` 'kesildi' olmalı ve Resend API mock'una PDF ekli e-posta payload'u düşmelidir.
- **Kargo Akışı:** Admin panelinde kargo bölümünden "DHL" seçilir, "123456789" takip numarası girilir ve "Yola Çıktı" olarak işaretlenir.
  - *Beklenti:* Sipariş durumu güncellenmeli ve Resend API mock'una kargo takip linki içeren e-posta payload'u düşmelidir.
- **Müşteri Doğrulama:** Müşteri portalına dönülür, sipariş detayına girilir.
  - *Beklenti:* "Faturayı İndir" ve "Kargomu Takip Et" butonları UI'da görünür ve tıklanabilir olmalıdır.

### 2. Negative Path (Hatalı Girişler ve Yetkisiz Erişimler)
- Müşteri, stokta olmayan bir ürünü sepete eklemeye çalışır (Sistemin engellemesi gerekir).
- Admin, kargo takip numarası girmeden "Yola Çıktı" butonuna basmaya çalışır (Validasyon hatası vermelidir).
- Lexware API'si hata (500) döndüğünde sistemin çökmemesi, admin'e anlamlı bir hata mesajı göstermesi ve siparişi "Fatura Kesildi" durumuna geçirmemesi gerekir.

### 3. Edge Cases (Sınır Durumlar)
- Sepetteki ürünlerin KDV dahil/hariç toplamlarının Lexware'e gönderilen tutarla kuruşu kuruşuna eşleşmesi (JavaScript floating-point kontrolleri).
- Kargo firması "Eigenversand" (Kendi Teslimatımız) seçildiğinde takip linki zorunluluğunun kalkması.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Test Ortamının ve Çevre Değişkenlerinin Hazırlanması**
  - `.env.test` dosyasını oluştur ve uzak Supabase URL, Anon Key ve `SUPABASE_SERVICE_ROLE_KEY` değerlerini ekle.
  - `playwright.config.ts` dosyasını `globalSetup` ve `globalTeardown` kullanacak şekilde yapılandır.

- [ ] **Adım 2: Setup ve Teardown Scriptlerinin Yazılması**
  - `tests/e2e/setup.ts` oluştur: `SUPABASE_SERVICE_ROLE_KEY` kullanarak `firmalar`, `profiller` ve `auth.users` tablolarına `test_e2e_dryrun@elysonsweets.de` kullanıcısını ve "E2E Test Firması"nı ekle.
  - `tests/e2e/teardown.ts` oluştur: Test bitiminde bu kullanıcıyı, firmayı ve oluşturulan test siparişlerini veritabanından kalıcı olarak sil.

- [ ] **Adım 3: E2E Test Dosyasının İskeletinin Kurulması**
  - `tests/e2e/order-fulfillment.spec.ts` dosyasını oluştur.
  - `test.beforeEach` içinde Lexware (`https://api.lexware.io/*`) ve Resend (`https://api.resend.com/*`) API'leri için `page.route` ile interceptor'ları (mock) yaz.

- [ ] **Adım 4: Müşteri Sipariş Akışının Kodlanması**
  - Müşteri context'inde login ol.
  - `/tr/portal/katalog` sayfasına git, ilk ürünü sepete ekle.
  - Sepet alanına git, siparişi tamamla.
  - Başarı mesajını doğrula ve oluşan Sipariş Numarasını (Order ID) bir değişkene kaydet.

- [ ] **Adım 5: Admin Fatura ve Kargo Akışının Kodlanması**
  - Yeni bir browser context'inde Admin olarak login ol.
  - `/tr/admin/operasyon/siparisler` sayfasına git, kaydedilen Sipariş Numarasını bul ve detayına gir.
  - "Ödeme Alındı & Fatura Kes" butonuna tıkla. Lexware ve Resend mock'larının doğru payload ile tetiklendiğini assert et.
  - Kargo bölümünde "DHL" seç, takip numarası gir, "Yola Çıktı" butonuna tıkla. Resend mock'unun kargo maili için tetiklendiğini assert et.

- [ ] **Adım 6: Müşteri Portalı Doğrulama Akışının Kodlanması**
  - Müşteri context'ine geri dön.
  - Sipariş detay sayfasını yenile (`page.reload()`).
  - `Faturayı İndir` butonunun görünürlüğünü doğrula.
  - `Kargomu Takip Et` butonunun görünürlüğünü doğrula.

- [ ] **Adım 7: Testlerin Koşulması ve Kod Onarımı (Fixing)**
  - `npx playwright test tests/e2e/order-fulfillment.spec.ts` komutunu çalıştır.
  - Testin başarısız olduğu adımları (eksik butonlar, API route hataları, UI kırılmaları) tespit et.
  - İlgili Next.js kaynak kodlarına (`SiparisDetayClient.tsx`, `siparis-muhasebe-actions.ts` vb.) müdahale ederek hataları düzelt. Testler %100 geçene kadar bu adımı tekrarla.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **CANLI VERİTABANI YASAĞI:** Testler kesinlikle `www.elysonsweets.de` canlı (production) veritabanında KOŞULMAMALIDIR. Staging/Dev veritabanı kullanılmalıdır.
2. **GERÇEK API KISITLAMASI:** Lexware ve Resend API'lerine test ortamından kesinlikle gerçek istek atılmamalıdır. Tüm dış servisler Playwright üzerinden mock'lanmalıdır.
3. **RLS POLİTİKALARINA DOKUNULMAYACAK:** Uzak veritabanındaki hiçbir RLS politikası testleri geçirmek amacıyla değiştirilmeyecektir. Tohumlama işlemleri sadece `SUPABASE_SERVICE_ROLE_KEY` ile yapılacaktır.
4. **ZORUNLU TEMİZLİK:** `teardown.ts` dosyası, test çökse bile çalışacak şekilde yapılandırılmalı ve veritabanında "E2E Test Firması" gibi çöpler bırakılmamalıdır.