# BAĞLAM (CONTEXT)
Sistem canlıya geçiş aşamasındadır. Gerçek veriler (stoklar, faturalar, giderler, analitikler) veritabanına işlenmektedir. Test siparişlerinin gerçek stokları düşmesini, Lexware'de fatura kesmesini, Stripe'tan para çekmesini, müşterilere e-posta/bildirim atmasını ve Meta Pixel verilerini bozmasını engellemek için sisteme `is_test` bayrağı (flag) entegre edilecektir.

# BAĞIMLILIKLAR (DEPENDENCIES)
- Supabase Database (Migration & Triggers)
- `src/lib/lexware/invoices.ts`
- `src/lib/stripe.ts`
- `src/lib/email.ts` & `src/lib/notificationUtils.ts`
- `src/lib/metaPixelEvents.ts`
- `src/app/actions/siparis-actions.ts`

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
Lütfen aşağıdaki adımları sırasıyla uygula. Bir adımı bitirmeden diğerine geçme.

- [ ] **Adım 1: Veritabanı Migration (is_test Kolonu)**
  - `supabase/migrations/` dizininde `[tarih]_add_is_test_to_siparisler.sql` adında yeni bir dosya oluştur.
  - `siparisler` tablosuna `is_test BOOLEAN DEFAULT false` kolonunu ekle.
  - `src/lib/supabase/database.types.ts` dosyasını bu yeni kolonu içerecek şekilde güncelle.

- [ ] **Adım 2: Stok ve Finansal Kayıtların Korunması (Backend & Triggers)**
  - Stok düşümünü yapan RPC veya Server Action dosyalarını bul. Sipariş `is_test === true` ise stok düşüm işlemini ATLA.
  - `supabase-migrations/auto_finance_and_stock_on_siparis_teslim.sql` içindeki `fn_siparis_teslim_finans_ve_stok` trigger'ını güncelle. En başa `IF NEW.is_test = true THEN RETURN NEW; END IF;` ekle.

- [ ] **Adım 3: E-posta, Push Bildirim ve CRM Koruması (Triggers & Actions)**
  - Veritabanındaki `notify_admins_on_portal_order` ve `notify_customer_on_order_status_change` trigger fonksiyonlarını güncelle. En başa `IF NEW.is_test = true THEN RETURN NEW; END IF;` ekleyerek test siparişlerinde bildirim atılmasını engelle.
  - `siparis-actions.ts` veya ilgili yerlerdeki `sendOrderConfirmationEmail` ve `sendShippingEmail` çağrılarından önce `is_test` kontrolü yap. Test ise e-posta gönderme.

- [ ] **Adım 4: Lexware Fatura Entegrasyonunun Korunması**
  - `src/lib/lexware/invoices.ts` dosyasını aç.
  - `createLexwareInvoiceForOrder` fonksiyonunda, eğer `siparis.is_test === true` ise, Lexware API'sine gerçek istek atmak yerine konsola `[TEST MODE] Lexware faturası atlandı` yazdır ve sahte bir `{ invoiceId: 'test-inv-id', invoiceNo: 'TEST-001', pdfUrl: '#' }` objesi dön.

- [ ] **Adım 5: Stripe ve Meta Pixel Koruması (Frontend & Payments)**
  - Stripe ödeme oturumu (Checkout Session) oluşturulurken sipariş `is_test` ise gerçek ödeme alma, test modunda çalıştır veya bypass et.
  - Sipariş başarılı sayfasına (Success Page) gidildiğinde, `trackPurchase` (Meta Pixel) event'ini tetiklemeden önce siparişin `is_test` olup olmadığını kontrol et. Test ise Pixel event'ini KESİNLİKLE tetikleme.

- [ ] **Adım 6: Admin Paneli UI Güncellemesi**
  - Admin panelinde manuel sipariş oluşturulan ekrana sadece `Yönetici` rolünün görebileceği bir "Bu bir test siparişidir" (Checkbox/Toggle) ekle.
  - Bu toggle işaretlendiğinde veritabanına `is_test: true` olarak kayıt atılmasını sağla.
  - Siparişler listesinde (Table/Grid) test siparişlerini ayırt edebilmek için yanlarına belirgin bir "TEST" etiketi (Badge) koy.

# KATI KURALLAR VE ANTİ-PATTERN'LER
- KESİNLİKLE YAPMA: Geçmiş test siparişlerini temizlemek için `DELETE FROM siparisler` komutu yazma.
- KESİNLİKLE YAPMA: `giderler` veya `alt_bayi_giderleri` tablolarında hiçbir şekilde silme veya truncate işlemi yapma.
- ZORUNLULUK: Lexware, Stripe, Resend (Email) ve Meta Pixel'e giden tüm fonksiyonlarda `is_test` kontrolü en üst satırda (Early Return) yapılmalıdır.