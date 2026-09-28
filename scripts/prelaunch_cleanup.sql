-- ==============================================================================
-- ELYSON SWEETS - CANLI ÖNCESİ HASSAS VERİTABANI TEMİZLİĞİ (SURGICAL CLEAN)
-- DİKKAT: Bu script SADECE test siparişlerini, talepleri ve test portal hesaplarını siler.
-- KORUNANLAR: Firmalar, Görevler, Giderler, Etkinlikler, Ürünler, Kategoriler, Adminler.
-- ==============================================================================

BEGIN;

-- 1. Sipariş ve Satış Verilerini Sıfırla (Siparişler, Detaylar, Faturalar)
TRUNCATE TABLE public.siparisler CASCADE;
TRUNCATE TABLE public.alt_bayi_satislar CASCADE;
TRUNCATE TABLE public.alt_bayi_satis_kayitlari CASCADE;

-- 2. Alt Bayi Test Finans ve Stok Verilerini Sıfırla
TRUNCATE TABLE public.alt_bayi_giderleri CASCADE;
TRUNCATE TABLE public.alt_bayi_gelirleri CASCADE;
TRUNCATE TABLE public.alt_bayi_stoklari CASCADE;

-- 3. Test Amaçlı Talepleri ve Yorumları Sıfırla
TRUNCATE TABLE public.numune_talepleri CASCADE;
TRUNCATE TABLE public.yeni_urun_talepleri CASCADE;
TRUNCATE TABLE public.sample_requests CASCADE;
TRUNCATE TABLE public.urun_degerlendirmeleri CASCADE;

-- 4. Loglar, Bildirimler ve İletişim Mesajlarını Sıfırla (Temiz bir sayfa için)
TRUNCATE TABLE public.ai_chat_logs CASCADE;
TRUNCATE TABLE public.bildirimler CASCADE;
TRUNCATE TABLE public.iletisim_mesajlari CASCADE;
TRUNCATE TABLE public.waitlist CASCADE;

-- 5. Test profillerine atanmış test amaçlı görevleri sil (Foreign key hatasını önlemek için)
DELETE FROM public.gorevler WHERE atanan_kisi_id IN (SELECT id FROM public.profiller WHERE rol IN ('Müşteri', 'Alt Bayi'));

-- 6. SADECE Test Amaçlı Açılmış Müşteri/Alt Bayi Profillerini Sil
-- (Gerçek firmalar silinmeyecek, sadece onlara bağlı test portal giriş yetkileri silinecek)
DELETE FROM public.profiller WHERE rol IN ('Müşteri', 'Alt Bayi');

-- NOT: firmalar, gorevler (adminlerin gerçek görevleri), giderler, etkinlikler, urunler KORUNDU!

COMMIT;
