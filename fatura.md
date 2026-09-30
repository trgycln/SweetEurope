# BAĞLAM VE MİMARİ KARARLAR (CONTEXT & ARCHITECTURE)

**Kullanıcı Sorularına İstinaden Mimari Kararlar:**
1. **Fatura Formatı ve Tasarımı (Lexware):** Fatura PDF'ini biz kodlamayacağız. Lexware Office, Alman vergi hukukuna (GoBD) %100 uyumlu, yasal olarak geçerli PDF'leri kendi içinde üretir. Bizim yazdığımız `createLexwareInvoiceForOrder` fonksiyonu sadece sipariş verilerini (ürünler, net fiyatlar, KDV oranları) Lexware'e JSON olarak gönderir. Lexware bu veriyi alır, senin Lexware panelinde ayarladığın şablona (Logon, şirket bilgilerin, altbilgiler) oturtarak resmi PDF'i oluşturur. Biz sadece o PDF'i API üzerinden indirip müşteriye mail atacağız. (Not: Lexware paneline girip şirket logonu ve banka bilgilerini ayarlaman yeterlidir).
2. **Ödeme Sistemleri (Stripe & Havale):** Hem Stripe (Kredi Kartı/Apple Pay) hem de Vorkasse (Havale) aktif olacak.
3. **Tetikleyici (Trigger):** Fatura, sipariş durumu "Ödendi" (Paid) olduğunda kesilecek. Stripe ödemelerinde bu otomatik (Webhook ile), Havale ödemelerinde ise Admin panelinden manuel butona basıldığında gerçekleşecek.
4. **İptal (Storno):** Kısmi iade yapılmayacak. Sipariş iptal edildiğinde Lexware'de tam "Rechnungskorrektur" (Storno) kesilecek, stoklar geri yüklenecek ve müşteriye iptal faturası mail atılacak.

**Görev Kapsamı:**
Siparişin ödenmesinden faturanın kesilip müşteriye e-posta ile (PDF ekli olarak) gönderilmesine, Stripe webhook entegrasyonuna ve iptal/storno süreçlerinin Admin UI'a bağlanmasına kadar olan uçtan uca ERP/Muhasebe akışının kurulması.

Çalışılacak Dosyalar:
- `src/lib/email.ts` (PDF ekli yeni mail şablonları)
- `src/app/actions/siparis-muhasebe-actions.ts` (Yeni - Fatura ve İptal iş mantığı)
- `src/app/api/webhooks/stripe/route.ts` (Yeni - Stripe otomatik ödeme dinleyicisi)
- `src/components/admin/operasyon/siparisler/SiparisDetayClient.tsx` (veya ilgili Admin Sipariş Detay bileşeni)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `stripe` (Webhook doğrulaması için)
- `resend` (PDF attachment destekli e-posta gönderimi için)
- Mevcut `src/lib/lexware/invoices.ts` servisleri.

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: E-posta Servisinin PDF Eklerini (Attachments) Destekleyecek Şekilde Güncellenmesi**
  - `src/lib/email.ts` dosyasını aç.
  - `sendInvoiceEmail` adında yeni bir fonksiyon oluştur. Parametre olarak `to`, `orderNo`, `pdfBuffer`, `pdfFilename` alsın. Resend'in `attachments: [{ filename: pdfFilename, content: pdfBuffer }]` özelliğini kullanarak müşteriye "Ödemeniz alındı, faturanız ektedir" temalı Almanca bir mail göndersin.
  - `sendStornoEmail` adında bir fonksiyon daha oluştur. Sipariş iptal edildiğinde "Siparişiniz iptal edildi, İptal Faturanız (Rechnungskorrektur) ektedir" temalı bir mail göndersin.

- [ ] **Adım 2: Muhasebe ve Sipariş İş Mantığının (Server Actions) Yazılması**
  - `src/app/actions/siparis-muhasebe-actions.ts` adında yeni bir dosya oluştur.
  - **Fonksiyon 1: `processOrderPaymentAction(siparisId: string)`**
    1. Siparişin `odeme_durumu`'nu 'paid' (Ödendi) yap.
    2. Siparişin `lexware_invoice_id`'si var mı kontrol et. Yoksa `createLexwareInvoiceForOrder(siparisId)` çağırarak faturayı kes.
    3. `getLexwareInvoicePdfBuffer` ile PDF'i indir.
    4. `sendInvoiceEmail` ile müşteriye gönder.
  - **Fonksiyon 2: `cancelOrderAndStornoAction(siparisId: string, reason: string)`**
    1. Siparişin `lexware_invoice_id`'si var mı bak. Varsa `cancelLexwareInvoiceForOrder` çağırarak Storno kes.
    2. Storno kesildiyse `getLexwareCreditNotePdfBuffer` ile PDF'i al ve `sendStornoEmail` ile müşteriye at.
    3. Supabase RPC `restore_order_stock(siparisId)` fonksiyonunu çağırarak stokları geri yükle.
    4. Sipariş durumunu 'İptal Edildi' yap.

- [ ] **Adım 3: Stripe Webhook Entegrasyonu (Otomatik Fatura)**
  - `src/app/api/webhooks/stripe/route.ts` dosyasını oluştur.
  - Stripe'tan gelen POST isteğini `stripe.webhooks.constructEvent` ile doğrula (`STRIPE_WEBHOOK_SECRET` kullanarak).
  - Event tipi `checkout.session.completed` veya `payment_intent.succeeded` ise:
    - Session'ın `metadata.orderId` veya `client_reference_id` alanından Supabase sipariş ID'sini al.
    - `processOrderPaymentAction(orderId)` fonksiyonunu çağır. (Böylece müşteri kredi kartıyla ödediği saniye fatura kesilip mailine düşecek).

- [ ] **Adım 4: Admin Paneli UI Entegrasyonu**
  - Admin sipariş detay sayfasını (`SiparisDetayClient.tsx` veya ilgili bileşen) aç.
  - "Ödeme Alındı Olarak İşaretle" butonunun `onClick` eventini `processOrderPaymentAction`'a bağla. (Havale ile ödeyenler için manuel tetikleyici).
  - "Siparişi İptal Et" butonunu `cancelOrderAndStornoAction`'a bağla.
  - Ekrana "Faturayı İndir" ve (varsa) "İptal Faturasını (Storno) İndir" butonları ekle. Bu butonlar `lexware_pdf_url` üzerinden API'ye istek atıp PDF'i tarayıcıda açsın/indirsin.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **IDEMPOTENCY (TEKRARLANABİLİRLİK KORUMASI):** `processOrderPaymentAction` ve `cancelOrderAndStornoAction` fonksiyonları KESİNLİKLE idempotent olmalıdır. Yani Admin yanlışlıkla "Ödendi" butonuna iki kere basarsa, Lexware'de iki tane fatura KESİLMEMELİDİR. Fonksiyonun en başında `if (siparis.lexware_invoice_id) return;` gibi bir kontrol mutlaka olmalıdır.
- **HATA YÖNETİMİ (GRACEFUL FAILURE):** Lexware API'si çökerse veya PDF indirilemezse, siparişin veritabanındaki durumu güncellenmeli ancak Admin'e "Sipariş ödendi olarak işaretlendi fakat Lexware faturası kesilemedi, lütfen Lexware panelinden manuel kontrol edin" şeklinde net bir `toast.error` veya `toast.warning` gösterilmelidir. Sistem tamamen çökmemelidir.
- **STRIPE GÜVENLİĞİ:** Webhook route'unda `req.text()` kullanılarak raw body alınmalı ve Stripe signature doğrulaması KESİNLİKLE yapılmalıdır. Aksi takdirde sahte isteklerle siparişler "Ödendi" statüsüne çekilebilir.
- **STOK BÜTÜNLÜĞÜ:** İptal işleminde `restore_order_stock` RPC'si çağrılmadan işlem bitirilmemelidir. Stokların eksiye düşmemesi veya havada kalmaması B2B ticareti için kritiktir.