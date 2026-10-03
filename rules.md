# ELYSON SWEETS (elysonsweets.de) — PROJE GELİŞTİRME VE MİMARİ KURALLARI (RULES.MD)

> **KİMLİK VE TEMEL FELSEFE:**  
> Elyson Sweets, sadece görsel bir vitrin değil; Almanya ve Avrupa genelinde faaliyet gösteren, toptan şekerleme, sos, şurup ve tatlı ürünleri tedarik eden **aktif bir B2B & HoReCa e-ticaret platformudur**.  
> Geliştirilen her bileşen, API, veritabanı sorgusu ve kullanıcı arayüzü; hem **Awwwards kalitesinde estetik ve pürüzsüz UX** sunmalı, hem de **Alman ticaret/vergi hukukuna (BGB, UStG, GoBD)** ve **yüksek hacimli toptan ticaretin gerçeklerine** %100 sadık kalmalıdır.

---

## 1. B2B İŞ MANTIĞI ÖNCELİĞİ (BUSINESS LOGIC FIRST)
*İlgili Beceriler: `api-and-interface-design`, `frontend-ui-engineering`, `constraint-driven-development`*

1. **Fiyatlandırma Standardı (Net & MwSt Şeffaflığı):**
   - B2B platformunda varsayılan tüm fiyat gösterimleri **NET** olmalıdır.
   - Her sayfada, sepet özetinde, fatura dökümünde ve e-postada KDV oranı ve tutarı şeffafça ayrıştırılmalıdır:
     - Gıda ve hammadde ürünleri: **%7 UStG**.
     - Hizmet, nakliye ve kargo bedelleri: *Nebenleistung* prensibine uygun olarak ana sipariş KDV'siyle uyumlu (%7 gıda siparişi için %7).
     - Standart tüketim/ekipman ürünleri: **%19 UStG**.
   - Asla `KDV = Brüt - Net` gibi kargoyu veya diğer kalemleri yutan ilkel hesaplamalar yapılmayacaktır.
2. **MOQ (Minimum Order Quantity / Mindestbestellmenge):**
   - Toptan alıcılar için koli ve palet kuralları esastır. B2B sepetinde genel minimum eşik (örn: 1 tam koli) ve ürün bazlı minimum sipariş adedi kontrolleri hem istemci (frontend) hem sunucu (server action / API) tarafında doğrulanmalıdır.
3. **Koli & Palet Hacim İndirimleri (Staffelpreise):**
   - Tekil adet, koli içi adet (VPE - Verpackungseinheit) ve palet hacmi dinamik olarak hesaplanmalıdır.
   - Hacim bazlı fiyat kademeleri müşteri profilinin `pricing_tier` veya iskonto oranına göre anlık uygulanmalıdır.
4. **Ticari Müşteri Doğrulaması (BGB § 14 - Unternehmernachweis):**
   - Platform son tüketiciye (B2C / BGB § 13) değil, tacirlere (B2B / BGB § 14) yöneliktir.
   - Müşteri onay süreçlerinde ticari unvan, USt-IdNr (Vergi Kimlik Numarası) ve Gewerbeanmeldung kontrol akışları korunmalı, onaysız profiller toptan fiyatları manipüle edememelidir.

---

## 2. STOK VE VERİTABANI GÜVENLİĞİ (DATABASE HARDENING & STOCK INTEGRITY)
*İlgili Beceriler: `security-and-hardening`, `test-driven-development`, `debugging-and-error-recovery`*

1. **Dinamik Stok & Ausverkauft Yönetimi:**
   - Stokta tükenen ürünler (`stok_miktari <= 0`) kullanıcıyı yanıltmayacak şekilde dinamik olarak **"Ausverkauft"** veya **"Ön Sipariş (Vorbestellung)"** durumuna geçmelidir.
   - Ön sipariş ürünleri ile anlık stoklu ürünler sepet ve sipariş akışında (`topluSiparisOlusturAction`) net bir şekilde ayrılmalı; stoksuz ürünler için ön sipariş kaydı tutulmalı, depoda mevcut olanlar için stok rezerve edilmelidir.
2. **Eşzamanlılık ve Yarış Durumu (Race Condition) Koruması:**
   - Stok düşümlerinde istemci verisine asla güvenilmez. Supabase üzerinde atomik güncellemeler veya RPC fonksiyonları kullanılarak stokun eksiye düşmesi (`stok_miktari < 0`) engellenmelidir.
3. **Veri Bütünlüğü & GoBD Uyumluluğu:**
   - Kesilmiş bir Lexware faturası (`lexware_invoice_id`) veya onaylanmış sipariş kaydı veritabanından sessizce silinemez.
   - İptal işlemleri her zaman ters kayıt (*Storno / Rechnungskorrektur*) ve durum güncellemesi (`İptal Edildi`) şeklinde denetim izi (audit trail) bırakarak yapılmalıdır.

---

## 3. ÇOKLU DİL (i18n) BÜTÜNLÜĞÜ
*İlgili Beceriler: `frontend-ui-engineering`, `source-driven-development`*

1. **Almanca (DE) Ana Dil Standardı:**
   - Şirketin merkez pazarı Almanya (NRW / Köln-Bonn) olduğundan, birincil ve resmi dil **Almanca (de)**'dır.
   - Tüm yasal metinler (AGB, Impressum, Datenschutz, Widerruf), fatura başlıkları, Lexware ürün açıklamaları ve sistem bildirimleri öncelikle kusursuz Almanca dilbilgisiyle yazılmalıdır.
2. **Güvenli Fallback Mekanizması:**
   - Veritabanındaki ürün isimleri ve açıklamaları JSONB çoklu dil formatındadır (`{ de: "...", tr: "...", en: "..." }`).
   - Kod yazarken tek bir dile sabitlenmek (`urun.ad.de`) yerine, her zaman fallback destekleyen yardımcı fonksiyonlar kullanılmalıdır:
     `ad?.[locale] || ad?.de || ad?.tr || Object.values(ad || {})[0] || ''`
3. **Lokalizasyon Formatları:**
   - Para birimi: Alman/AB standardı (`1.250,00 €` — nokta binlik, virgül ondalık).
   - Tarih: `DD.MM.YYYY` veya `19. September 2026`.

---

## 4. UI TASARIMININ ÖTESİ: CORE WEB VITALS & HIZLI SİPARİŞ (QUICK ORDER)
*İlgili Beceriler: `performance-optimization`, `premium-animations`, `frontend-ui-engineering`*

1. **Toptancı Ergonomisi (B2B Quick Order):**
   - Toptan alıcılar (kafe zincirleri, oteller, toptancılar) saatlerce ürün aramak istemez. Hızlı koli siparişi verme, barkod/stok koduyla arama ve klavye dostu (Tab + Enter ile hızlı miktar girişi) sepet ekranları hayati önemdedir.
   - Tablo görünümleri kompakt, yüksek bilgi yoğunluğuna sahip ve anlık tepki veren yapıda olmalıdır.
2. **Core Web Vitals & Sayfa Hızı:**
   - Görsel ağırlıklı zengin içerik sunulurken **LCP (Largest Contentful Paint)** ve **CLS (Cumulative Layout Shift)** değerleri yeşil bölgede tutulmalıdır.
   - Görseller daima `next/image` ile optimize edilmeli, `sizes` ve `priority` etiketleri bilinçli verilmelidir.
   - Aşırı ağır Javascript kütüphaneleri veya gereksiz render döngüleri engellenmelidir.
3. **Dengeli Animasyon Politikası:**
   - Animasyonlar arayüzü yavaşlatan bir yük değil; kullanıcının aksiyonunu onaylayan, saygınlık hissi veren hafif mikro-etkileşimler (micro-interactions) olmalıdır.
   - Donanım hızlandırmalı CSS özellikleri (`transform`, `opacity`) tercih edilmeli; CPU'yu yoran layout-thrashing animasyonlardan kaçınılmalıdır.
   - `prefers-reduced-motion` erişilebilirlik tercihi her zaman saygıyla karşılanmalıdır.

---

## 5. MEVCUT 26 SKİLL İLE ÇALIŞMA HARMONİSİ
Projede yüklü olan 26 beceri (Skills) şu B2B fazlarında zorunlu rehber olarak devreye girer:
- **Analiz & Planlama:** `spec-driven-development`, `planning-and-task-breakdown`, `interview-me`, `idea-refine`
- **Tasarım & Deneyim:** `frontend-ui-engineering`, `premium-animations`, `api-and-interface-design`
- **Uygulama & Güvenlik:** `incremental-implementation`, `security-and-hardening`, `test-driven-development`, `source-driven-development`
- **Kalite, Performans & Sevk:** `performance-optimization`, `code-review-and-quality`, `code-simplification`, `browser-testing-with-devtools`, `shipping-and-launch`
- **Süreç & Denetim:** `git-workflow-and-versioning`, `documentation-and-adrs`, `observability-and-instrumentation`, `constraint-driven-development`, `doubt-driven-development`

---

> ⚠️ **KATI KURAL:** Gelecekteki herhangi bir geliştirmede veya kod revizyonunda, salt görsel güzelleştirme uğruna yukarıdaki 4 sütundan (B2B Mantığı, Stok Güvenliği, i18n Bütünlüğü, CWV/Performans) taviz verilmesi KESİNLİKLE YASAKTIR.


## 6. CANLI VERİ KORUMASI VE GÜVENLİ TEST (PRODUCTION DATA PROTECTION & SAFE TESTING)
*İlgili Beceriler: `security-and-hardening`, `database-administration`, `doubt-driven-development`*

1. **YIKICI İŞLEMLERE SIFIR TOLERANS (ZERO DELETION POLICY):**
   - AI Asistanı (IDE), veritabanı üzerinde KESİNLİKLE `DELETE`, `TRUNCATE`, `DROP` komutları çalıştıramaz.
   - Test verilerini temizleme talebi gelse dahi, veriler fiziksel olarak silinmez. Sadece `status = 'İptal Edildi'` veya `is_deleted = true` (Soft Delete) şeklinde güncellenir.
   - İlişkisel tablolarda (örn: `siparisler` ve `giderler`) Cascade Delete riskine karşı manuel silme scriptleri yazmak YASAKTIR.
2. **TEST SİPARİŞİ İZOLASYONU (TEST ORDER ISOLATION):**
   - Canlı sistemde yapılan testler için `siparisler` tablosunda `is_test` (boolean) bayrağı kullanılacaktır.
   - `is_test = true` olan bir sipariş KESİNLİKLE:
     a) `urunler` veya `alt_bayi_stoklari` tablosundan gerçek stok DÜŞÜREMEZ.
     b) `giderler`, `alt_bayi_giderleri` veya `finans_kasa_islemleri` tablolarına finansal kayıt ATAMAZ.
     c) Lexware API'sine gidip gerçek bir fatura (Invoice) OLUŞTURAMAZ (Sadece Mock/Test endpoint çalışır).
3. **API ORTAM GÜVENLİĞİ (API ENVIRONMENT STRICTNESS):**
   - Stripe ve Lexware entegrasyonlarında `NODE_ENV === 'production'` kontrolü esastır.
   - Eğer bir sipariş `is_test = true` ise, sistem production'da olsa bile Stripe ödemesi "Test Mode" parametreleriyle veya bypass edilerek çalıştırılmalıdır.

   ## 7. MCP ARAÇLARI VE OTOMASYON İŞ AKIŞI (MCP TOOLS & AUTOMATION WORKFLOW)
*İlgili Beceriler: `tool-usage`, `database-administration`, `git-workflow-and-versioning`*

Sisteme entegre edilmiş MCP (Model Context Protocol) araçları bulunmaktadır: **Supabase, Stripe, Vercel, Resend, GitHub.**
Bu araçların kullanımıyla ilgili şu kurallar KESİNDİR:

1. **KOPYALA-YAPIŞTIR HAMALLIĞI YASAKTIR:**
   - Kullanıcıya "Bu SQL kodunu kopyala ve Supabase SQL Editor'e yapıştır" demek YASAKTIR.
   - Kullanıcıya "Stripe dashboard'a git ve şu ayarı yap" demek YASAKTIR.
   - Elindeki MCP araçlarını kullanarak işlemleri doğrudan sen yapmalısın.
2. **SUPABASE VERİTABANI İŞ AKIŞI (GÜVENLİK PROTOKOLÜ):**
   - **Okuma (READ):** Şema kontrolü, tablo yapısı inceleme veya test verisi arama işlemleri için Supabase MCP'yi kullanıcıya sormadan anında kullan.
   - **Yazma/Değiştirme (WRITE/DDL):** Veritabanında bir tablo oluşturulacaksa veya güncellenecekse:
     1. Önce ilgili `.sql` migration dosyasını projeye (örn: `supabase/migrations/`) kaydet.
     2. Kullanıcıya şu soruyu sor: *"Migration dosyasını oluşturdum. Supabase MCP kullanarak veritabanına doğrudan uygulayayım mı?"*
     3. Kullanıcı onay verirse MCP üzerinden SQL'i çalıştır. Onaysız DDL/DML çalıştırmak YASAKTIR.
3. **DİĞER MCP ARAÇLARI:**
   - **GitHub:** Commit ve Push işlemleri için kullanıcıdan onay alarak MCP'yi kullan.
   - **Resend & Stripe:** Logları incelemek, test ödemesi kontrol etmek veya webhook durumlarını sorgulamak için MCP araçlarını proaktif olarak kullan.