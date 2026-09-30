# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Bu test planı, `www.elysonsweets.de` projesi için kritik öneme sahip "Uçtan Uca (E2E) Sipariş ve Teslimat İş Akışı"nın (Dry Run Simülasyonu) otomatikleştirilmesi, test edilmesi ve olası hataların onarılması amacıyla oluşturulmuştur. 

**Kapsanan Modüller:**
- **Müşteri Portalı (B2B):** Oturum açma, sepet yönetimi, "Havale (Vorkasse)" ile sipariş oluşturma, sipariş geçmişi ve detay görüntüleme.
- **Admin Paneli:** Sipariş yönetimi, ödeme onayı, Lexware entegrasyonu ile fatura kesimi, kargo (DHL) yönetimi ve takip numarası atama.
- **Bildirim Sistemi:** Fatura (PDF ekli) ve Kargo takip linki içeren e-posta gönderim tetikleyicileri.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **Test Türü:** Uçtan Uca (End-to-End / E2E) ve Entegrasyon Testleri.
- **Önerilen Araç:** Playwright (Çoklu tarayıcı bağlamı - multi-context desteği sayesinde Müşteri ve Admin oturumlarını eşzamanlı simüle edebilmek için en uygunudur).
- **Mocking & Stubbing:** 
  - Lexware API: Gerçek fatura kesilmesini önlemek için Lexware API istekleri (POST /invoice vb.) intercept edilip `200 OK` ve sahte bir PDF URL'si dönecek şekilde mock'lanmalıdır.
  - E-posta Servisi (SMTP/SendGrid/AWS SES vb.): Gerçek e-posta gönderimi yerine, e-posta gönderim fonksiyonları spy/mock ile dinlenmeli veya Mailtrap/Ethereal gibi test SMTP sunucuları kullanılmalıdır. Payload içinde PDF ekinin ve kargo takip linkinin varlığı assert edilmelidir.
- **Veritabanı:** Testler izole bir test veritabanında (veya transaction rollback mantığıyla) çalıştırılmalıdır. Canlı stokların etkilenmemesi kritiktir.

---

# TEST SENARYOLARI (TEST CASES)

### 1. Happy Path (Sorunsuz Akış - Ana Hedef)
- Müşteri test hesabıyla giriş yapar.
- Stokta bulunan 1-2 ürün sepete eklenir.
- Ödeme yöntemi olarak "Havale (Vorkasse)" seçilir ve sipariş tamamlanır.
- Admin paneline giriş yapılır, yeni sipariş bulunur ve detayına gidilir.
- "Ödeme Alındı Olarak İşaretle & Fatura Kes" butonuna tıklanır.
  - *Beklenti:* Lexware API'sine doğru payload gönderilmeli, sistemde fatura oluşmalı ve müşteriye PDF ekli e-posta tetiklenmelidir.
- Kargo panelinden "DHL" seçilir, geçerli formatta bir test takip numarası girilir ve "Yola Çıktı Olarak İşaretle" butonuna tıklanır.
  - *Beklenti:* Sipariş durumu güncellenmeli ve müşteriye kargo takip linki içeren e-posta tetiklenmelidir.
- Müşteri portalına dönülür, sipariş detayına girilir.
  - *Beklenti:* "Faturayı İndir" ve "Kargomu Takip Et" butonları görünür ve tıklanabilir (doğru URL'lere yönlendirir) olmalıdır.

### 2. Negative Path (Hatalı Girişler ve Yetkisiz Erişimler)
- Müşteri, stokta olmayan bir ürünü sepete eklemeye veya sepet miktarını mevcut stoktan fazlasına çıkarmaya çalışır (Sistemin engellemesi gerekir).
- Admin yetkisi olmayan bir kullanıcı (veya standart müşteri), admin sipariş detay sayfasına veya fatura kesme endpoint'ine erişmeye çalışır (403 Forbidden dönmelidir).
- Admin, kargo takip numarası girmeden "Yola Çıktı Olarak İşaretle" butonuna basmaya çalışır (Validasyon hatası vermelidir).
- Lexware API'si hata (500 Internal Server Error) döndüğünde sistemin çökmemesi, admin'e anlamlı bir hata mesajı göstermesi ve siparişi "Fatura Kesildi" durumuna **geçirmemesi** gerekir.

### 3. Edge Cases (Sınır Durumlar)
- Eşzamanlı İşlem: İki farklı admin aynı anda aynı sipariş için "Fatura Kes" butonuna basarsa, sistemin (Idempotency veya DB Lock ile) mükerrer fatura kesimini engellemesi.
- Kargo takip numarasının çok uzun (örn. 255 karakterden fazla) veya özel karakterler içermesi durumu.
- Virgülden sonraki küsurat hataları: Sepetteki ürünlerin KDV dahil/hariç toplamlarının Lexware'e gönderilen tutarla kuruşu kuruşuna eşleşmesi.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Test Ortamının Hazırlanması**
  - Playwright konfigürasyonunu (`playwright.config.ts`) kontrol et. Base URL ve test timeout sürelerini ayarla.
  - Test veritabanı bağlantılarını ve seed datalarını (Test Müşterisi, Test Admini, Test Ürünleri) oluşturacak `setup` scriptini yaz.

- [ ] **Adım 2: Mock ve Intercept Mantığının Kurulması**
  - Lexware API çağrılarını yakalayacak (intercept) ve başarılı bir fatura yanıtı dönecek Playwright route handler'larını yaz.
  - E-posta gönderim servisini (örneğin `nodemailer` veya 3rd party API) test ortamında mock'la.

- [ ] **Adım 3: Müşteri Sipariş Testinin (E2E) Yazılması**
  - `tests/e2e/order-fulfillment.spec.ts` dosyasını oluştur.
  - Müşteri girişi, sepete ürün ekleme ve "Vorkasse" ile sipariş tamamlama adımlarını kodla.
  - Sipariş numarasını (Order ID) bir değişkene kaydet.

- [ ] **Adım 4: Admin Fatura ve Kargo Testinin Yazılması**
  - Aynı test dosyası içinde yeni bir browser context (Admin Context) aç.
  - Admin girişi yap, kaydedilen Sipariş Numarasını arat ve detaya gir.
  - "Ödeme Alındı Olarak İşaretle & Fatura Kes" butonuna tıkla. Lexware mock'unun tetiklendiğini ve e-posta payload'unda PDF olduğunu assert et.
  - Kargo bölümünde "DHL" seç, `1234567890` takip numarasını gir, "Yola Çıktı" olarak işaretle. E-posta payload'unda takip linki olduğunu assert et.

- [ ] **Adım 5: Müşteri Portalı Doğrulama Testinin Yazılması**
  - Müşteri context'ine geri dön.
  - Sipariş detay sayfasını yenile (reload).
  - `Faturayı İndir` butonunun görünürlüğünü ve `href` niteliğini doğrula.
  - `Kargomu Takip Et` butonunun görünürlüğünü ve DHL takip linkini içerdiğini doğrula.

- [ ] **Adım 6: Testlerin Koşulması ve Hata Tespiti**
  - Yazılan testleri `npx playwright test` komutu ile çalıştır.
  - Başarısız olan adımları (örneğin butonun olmaması, API'nin 500 dönmesi, e-postanın tetiklenmemesi) tespit et.

- [ ] **Adım 7: Kod Onarımı (Fixing)**
  - Testlerin başarısız olduğu noktalarda ilgili kaynak kod dosyalarına (Next.js sayfaları, API route'ları, Prisma şemaları veya servis katmanı) müdahale et.
  - İş mantığı hatalarını, UI kırılmalarını veya eksik butonları düzelt.
  - Testler %100 geçene kadar Adım 6 ve Adım 7'yi tekrarla.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **CANLI VERİTABANI KORUMASI:** Testler kesinlikle `NODE_ENV=test` ortamında çalışmalı ve canlı veritabanı (`DATABASE_URL`) kullanılmamalıdır. Stokların eksiye düşmesi veya gerçek müşterilerin verilerinin bozulması kabul edilemez.
2. **GERÇEK API KISITLAMASI:** Stripe, Lexware, DHL veya gerçek SMTP sunucularına test ortamından kesinlikle istek atılmamalıdır. Tüm dış servisler mock'lanmalıdır.
3. **ATOMİK İŞLEMLER:** Her test kendi verisini oluşturmalı ve test bitiminde temizlemelidir (Teardown). Testler birbirine bağımlı olmamalıdır (Aynı dosya içindeki akış hariç).
4. **GÜVENLİK:** Admin endpoint'lerine yapılan isteklerde JWT/Session token doğrulaması kesinlikle test edilmeli, yetkisiz erişimlerin (Bypass) engellendiğinden emin olunmalıdır.
5. **KÜSURAT HASSASİYETİ:** Fatura tutarları hesaplanırken JavaScript'in floating-point hatalarına (örn. `0.1 + 0.2 = 0.30000000000000004`) karşı `Decimal.js` veya benzeri bir kütüphane kullanıldığı testlerde assert edilmelidir.