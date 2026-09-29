# Olay Müdahale ve Sistem Bakım Planı (Incident Response & Maintenance Plan)

## 1. BAĞLAM VE AMAÇ
Bu belge, **Elyson Sweets (elysonsweets.de)** B2B E-Ticaret ve ERP platformunun canlı ortamda (Production) karşılaşabileceği kriz anlarında izlenecek Olay Müdahale (Incident Response) prosedürlerini ve rutin sistem bakım (Maintenance) görevlerini tanımlar. Amaç; sistemin kesintisiz çalışmasını sağlamak, "Graceful Degradation" (zarif bozulma) prensibini korumak ve DSGVO/GoBD standartlarına uyumluluğu sürdürmektir.

---

## 2. KRİTİK SİSTEM BİLEŞENLERİ VE GÖZLEMLEME (OBSERVABILITY)
Sistem mimarisi aşağıdaki 3. parti servisler üzerine kuruludur. Kriz anında ilk kontrol edilecek alanlar şunlardır:
1. **Frontend & Hosting (Vercel):** Çökmeler (500 Hataları), Edge Function limitleri ve Cron Job tetiklenmeleri.
2. **Veritabanı & Auth (Supabase):** Veritabanı bağlantı havuzu (Connection Pooling), RLS politikaları, PITR (Point-in-Time Recovery) yedekleri.
3. **Muhasebe/ERP (Lexware):** API rate limitleri, Fatura (Storno/Invoice) senkronizasyon hataları.
4. **E-posta & Bildirim (Resend):** Teslim edilemeyen (Bounced) e-postalar ve spama düşme oranları.

---

## 3. OLAY MÜDAHALE (INCIDENT RESPONSE) PLAYBOOK'LARI

### 🔴 SEV 1: KRİTİK KESİNTİ (Sistem Tamamen Durdu veya Veri Kaybı)
* **Örnek Durumlar:** Supabase veritabanı çöktü, Vercel tamamen yanıt vermiyor, yetkisiz veri erişimi tespit edildi.
* **Aksiyon Planı:**
  1. **Tespiti Onayla:** Vercel Dashboard ve Supabase Logs üzerinden kesintinin kaynağını bul.
  2. **İzolasyon:** Eğer bir güvenlik zafiyeti/IDOR tespit edildiyse, anında sistemi bakım moduna al (Vercel üzerinden çevre değişkenlerine `MAINTENANCE_MODE=true` ekle).
  3. **Veri Kurtarma (Disaster Recovery):** Veri silinmesi veya bozulması varsa, Supabase'in otomatik günlük (veya PITR) yedeklerinden en son sağlam duruma dön (Restore).
  4. **İletişim:** B2B müşterilerine ve alt bayilere "Sistemde teknik bir bakım yapılmaktadır, siparişleriniz güvendedir" şeklinde toplu e-posta geç (Resend).

### 🟠 SEV 2: BÖLGESEL VEYA SERVİS BAZLI KESİNTİ (Zarif Bozulma Devrede)
* **Örnek Durumlar:** Lexware API çöktü (Fatura kesilemiyor), Resend e-posta atmıyor.
* **Aksiyon Planı:**
  1. **Zarif Bozulma (Graceful Degradation):** Sistem Lexware'e ulaşamadığında çökmemeli; siparişleri veritabanına "Beklemede" statüsünde kaydetmeye devam etmelidir. Müşteri sipariş verebilmeli, ancak faturası sistem düzeldiğinde kesilmelidir (Kuyruk/Queue mantığı).
  2. **Müdahale:** Servis sağlayıcının (Lexware/Resend) durum sayfasını (Status Page) kontrol et. Hata düzeldiğinde başarısız olan siparişleri admin panelinden manuel "Tekrar Dene" butonu ile işleme al.

### 🟡 SEV 3: KÜÇÜK HATALAR VE UI PROBLEMLERİ
* **Örnek Durumlar:** Çeviri hataları (i18n), tarayıcı bazlı stil bozulmaları, önemsiz API rate limit uyarıları.
* **Aksiyon Planı:** Haftalık sprintlere dahil edilip TDD kuralları çerçevesinde (test yazılarak) çözülür ve bir sonraki minör versiyonda canlıya alınır.

---

## 4. RUTİN BAKIM VE KONTROL LİSTESİ (MAINTENANCE)

Sistemin uzun yıllar sorunsuz çalışması için periyodik olarak yapılması gerekenler:

### Günlük Bakım (Gözlem)
- [ ] **Vercel Cron Jobs:** `vercel.json` içindeki görevlerin (Google Business Profile senkronizasyonu, Auto-Blog) sorunsuz tetiklendiği kontrol edilmelidir.
- [ ] **Hata Logları:** Sentry veya Supabase Logs üzerinden sıradışı 500 hataları veya "Permission Denied" (RLS ihlal denemeleri) izlenmelidir.

### Haftalık Bakım
- [ ] **Hayali Stok (Phantom Stock) Taraması:** Siparişi iptal edilen ancak stoku geri dönmeyen ürün olup olmadığı veritabanı üzerinden (RPC raporları ile) denetlenmelidir.
- [ ] **AI Log Temizliği:** `cleanupOldAiChatLogs` fonksiyonunun DSGVO kapsamında 30 günden eski yapay zeka sohbet kayıtlarını sildiği doğrulanmalıdır.

### Aylık Bakım
- [ ] **Güvenlik & Bağımlılık Güncellemeleri:** `npm audit` çalıştırılarak kütüphanelerdeki (özellikle Next.js, Supabase ve Stripe) güvenlik açıkları (CVE) kapatılmalıdır.
- [ ] **Performans (Vitals) İncelemesi:** SEO/GEO performansını korumak için Google Search Console ve Vercel Analytics üzerinden CLS (Cumulative Layout Shift) ve LCP (Largest Contentful Paint) değerleri incelenmelidir.

---

## 5. DSGVO VERİ İHLALİ (DATA BREACH) PROTOKOLÜ
Olası bir veri sızıntısında (Data Breach) yasal olarak 72 saat içerisinde yetkili mercilere (Almanya - BfDI) bildirim yapılması zorunludur.
1. İhlali durdur (Veritabanı şifrelerini rotasyona sok).
2. Sızan verinin kapsamını belirle (Hangi firmalar/kişisel veriler etkilendi?).
3. Etkilenen B2B müşterilerine yasal metinler doğrultusunda şeffaf bir bildirim gönder.
4. Sistemin RLS (Row Level Security) kurallarını derhal güvenlik testinden (Audit) geçir.
