# BAĞLAM (CONTEXT)
Bu görev, `elysonsweets.de` projesinin "Tedarikçi Sipariş Planı" (İthalat Partileri / Import Batches) modülünün, B2B ERP standartlarına uygun, 4 aşamalı (Taslak -> Yolda -> Maliyetlendirme -> Mal Kabul) bir "Tedarik Zinciri Yönetimi (Supply Chain Pipeline)" modülüne dönüştürülmesini kapsar.

Mevcut karmaşık tek sayfa yapısı terk edilecek; yerine çift kademeli indirim (%20 + %8) destekleyen, LUCID (Ambalaj Sicili) maliyetini otomatik hesaplayan, Smart DMS (Belge Yönetimi) entegreli ve atomik mal kabul otomasyonuna sahip sekmeli (Stepper/Tabs) bir UI inşa edilecektir.

**Kritik Mimari Karar (Master Data Driven):** Sipariş oluşturulurken kullanıcı SADECE ürünü seçecek ve koli miktarını girecektir. Toplam ağırlık, toplam adet ve baz fiyat gibi veriler KESİNLİKLE kullanıcıdan istenmeyecek; sistem tarafından `urunler` tablosundaki `birim_agirlik_kg`, `koli_ici_adet` ve `distributor_alis_fiyati` verileri kullanılarak otomatik hesaplanacaktır.

**Çalışılacak Dosyalar:**
- `supabase/migrations/[tarih]_supply_chain_pipeline.sql` (Yeni kolonlar, ayarlar ve RPC fonksiyonu)
- `src/lib/import-batch-utils.ts` (Maliyet ve indirim hesaplama motoru)
- `src/app/[locale]/admin/urun-yonetimi/tedarikci-siparis-plani/page.tsx` (Ana liste görünümü)
- `src/app/[locale]/admin/urun-yonetimi/tedarikci-siparis-plani/[id]/page.tsx` (Oluşturulacak: Sekmeli detay/yönetim sayfası)
- `src/app/actions/import-batch-actions.ts` (Sunucu eylemleri)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `lucide-react` (Aşama ikonları: Edit, Truck, Calculator, CheckCircle, FileText)
- `react-hook-form` & `zod` (Sipariş ve maliyet formları validasyonu)
- `src/components/admin/documents/SmartUploadModal.tsx` (Evrak yükleme entegrasyonu)
- `src/lib/supabase/server.ts` (Veritabanı işlemleri)

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Veritabanı Şema ve Ayar Güncellemeleri (Migration)**
  - Yeni bir migration dosyası oluştur (örn: `20261010_supply_chain_pipeline.sql`).
  - `ithalat_partileri` tablosuna kolonları ekle: `indirim_1_yuzde` (numeric, default 0), `indirim_2_yuzde` (numeric, default 0).
  - `ithalat_parti_kalemleri` tablosuna kolon ekle: `indirimli_alis_fiyati` (numeric, default 0).
  - `system_settings` tablosuna LUCID ayarını ekle: `INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES ('pricing_lucid_per_kg_eur', '0.02', 'number', 'LUCID Ambalaj Sicili KG başı tahmini maliyet (€)', 'pricing') ON CONFLICT DO NOTHING;`.

- [ ] **Adım 2: Atomik Mal Kabul Fonksiyonu (Supabase RPC)**
  - Aynı migration dosyası içine `complete_import_batch(p_batch_id UUID, p_user_id UUID)` adında bir PostgreSQL fonksiyonu (RPC) yaz.
  - Bu fonksiyon sırasıyla şunları yapmalıdır (Transaction içinde):
    1. Partinin durumunu kontrol et, zaten 'Tamamlandı' ise hata dön.
    2. Partinin durumunu 'Tamamlandı' yap.
    3. `ithalat_parti_kalemleri` tablosunda döngüye girerek her bir ürün için:
       - `urunler` tablosunda `stok_miktari = stok_miktari + kalem.miktar_adet` işlemini yap.
       - `urunler` tablosunda `son_gercek_inis_maliyeti_net = kalem.gercek_inis_maliyeti_net` güncellemesini yap.
       - `urun_stok_hareket_loglari` tablosuna `hareket_tipi: 'stok_artisi'`, `kaynak: 'ithalat_partisi'` olarak log at.
       - `tedarikci_fiyat_loglari` tablosuna standart fiyat ile gerçekleşen fiyat farkını kaydet.

- [ ] **Adım 3: Maliyet Hesaplama Motorunun (Utils) Güncellenmesi**
  - `src/lib/import-batch-utils.ts` dosyasını aç.
  - Çift kademeli indirim hesaplayan mantığı ekle: `indirimliFiyat = basePrice * (1 - indirim1/100) * (1 - indirim2/100)`. (Ticari yuvarlama kullan).
  - `buildBatchItemInsertRows` fonksiyonunu güncelle: `toplam_agirlik_kg` değeri artık dışarıdan alınmamalı, `(koli_sayisi * urun.koli_ici_adet) * urun.birim_agirlik_kg` formülüyle Master Data'dan hesaplanmalıdır.
  - `system_settings` üzerinden `pricing_lucid_per_kg_eur` değerini alacak şekilde parametreleri genişlet ve ürünün hesaplanan `toplam_agirlik_kg` değeri ile çarparak `dagitilan_ozel_gider_eur` (veya yeni bir alan) içine LUCID maliyetini otomatik olarak yedir.

- [ ] **Adım 4: UI/UX Yeniden Yapılandırması (Pipeline Arayüzü)**
  - `[id]/page.tsx` adında detay sayfası oluştur ve 4 sekmeli (Tabs) bir yapı kur:
    - **Sekme 1: Sipariş (Draft):** Tedarikçi seçimi, İndirim 1 ve İndirim 2 girişleri. Ürün ekleme tablosu. **Kullanıcı sadece ürünü seçecek ve koli miktarını girecektir.** Tablo; Toplam Adet, Toplam KG, Liste Fiyatı ve İndirimli Fiyatı otomatik hesaplayıp salt okunur (read-only) gösterecektir. "Siparişi Onayla ve Yola Çıkar" butonu.
    - **Sekme 2: Yolda (In Transit):** Sadece durum bilgisi ve tahmini varış tarihi gösterimi.
    - **Sekme 3: Maliyetlendirme (Costing):** Navlun, Gümrük, TRACES masraflarının girildiği form. Altında, ürünlere dağıtılmış nihai maliyetleri (Landed Cost) ve otomatik eklenen LUCID payını gösteren salt okunur tablo.
    - **Sekme 4: Belgeler (Smart DMS):** Bu siparişe (`tir_id = batch.id`) ait fatura ve gümrük belgelerinin yükleneceği alan. `SmartUploadModal` bileşenini buraya entegre et.

- [ ] **Adım 5: Entegrasyon ve Aksiyonların Bağlanması**
  - `src/app/actions/import-batch-actions.ts` dosyasında `completeBatchAction` oluştur. Bu action, Adım 2'de yazılan `complete_import_batch` RPC'sini çağırmalıdır.
  - UI'da, sipariş "Maliyetlendirme" aşamasındayken aktif olacak devasa bir **"Mal Kabulü Tamamla (Stoğa Al)"** butonu ekle. Tıklandığında kullanıcıdan onay iste (Confirm Modal) ve action'ı tetikle.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **MASTER DATA KESİNLİKLE KORUNACAKTIR:** Siparişe uygulanan %20 veya %8 gibi indirimler, `urunler` tablosundaki `distributor_alis_fiyati` kolonunu ASLA değiştirmemelidir. Bu kolon standart liste fiyatıdır. İndirimli fiyat sadece `ithalat_parti_kalemleri` tablosunda yaşar.
- **MANUEL VERİ GİRİŞİ YASAĞI:** Kullanıcıdan ürünün ağırlığı, koli içi adedi veya birim fiyatı KESİNLİKLE istenmeyecektir. Bu veriler `urunler` tablosundan çekilip UI'da otomatik hesaplanacaktır.
- **JAVASCRIPT İLE STOK TOPLAMA YASAKTIR:** Mal kabul işlemi sırasında stok artırımı yapılırken, frontend veya backend JS tarafında `mevcut_stok + yeni_stok` şeklinde okuma/yazma (read-modify-write) YAPILMAYACAKTIR. Bu işlem kesinlikle Adım 2'deki RPC içinde veritabanı seviyesinde (`stok_miktari = stok_miktari + X`) yapılmalıdır (Race Condition koruması).
- **YUVARLAMA HASSASİYETİ (KAUFMÄNNISCHES RUNDEN):** Çift kademeli indirim ve LUCID maliyeti hesaplanırken, JavaScript'in floating point hatalarını önlemek için her çarpım adımında `Math.round((val + Number.EPSILON) * 100) / 100` kullanılmalıdır.
- **KISMİ TESLİMAT ESNEKLİĞİ:** Mal kabul butonuna basılmadan ÖNCE, kullanıcının "Sipariş" sekmesine dönüp eksik/hasarlı gelen ürünlerin miktarını güncelleyebilmesine izin verilmelidir. Sistem maliyetleri anında yeni miktara göre yeniden hesaplamalıdır.