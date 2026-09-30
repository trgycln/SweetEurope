# BAĞLAM (CONTEXT)
Bu görev, sistemin canlıya çıkış (Production Launch) öncesi son pürüzlerinin giderilmesini kapsar. İki ana hedef vardır:
1. **Build Kurtarma (Blog TS Fix):** `database.types.ts` dosyasındaki `blog_yazilari` tablosu tanımları ile veritabanındaki gerçek kolonlar (migration dosyasındaki) uyuşmamaktadır. Eski Türkçe kolon isimleri (`baslik`, `icerik`) yerine yeni JSONB kolonları (`title`, `content`, `excerpt`) tiplere ve frontend bileşenlerine işlenerek `npm run build` hatasız hale getirilecektir.
2. **Kargo ve Teslimat (Fulfillment) Akışı:** Siparişin kargoya verilmesi, takip numarasının girilmesi ve müşteriye "Siparişiniz Yola Çıktı" e-postasının (Tracking Link ile birlikte) otomatik gönderilmesi sağlanacaktır.

Çalışılacak Dosyalar:
- `src/lib/supabase/database.types.ts` (Tip düzeltmesi)
- `src/app/[locale]/(public)/blog/...` (Blog frontend bileşenlerindeki eski kolon isimlerinin güncellenmesi)
- `supabase/migrations/[tarih]_add_shipping_tracking.sql` (Yeni)
- `src/lib/email.ts` (Kargo e-posta şablonu)
- `src/app/actions/siparis-kargo-actions.ts` (Yeni)
- `src/components/admin/operasyon/siparisler/SiparisDetayClient.tsx` (veya ilgili Admin Sipariş UI bileşeni)

# BAĞIMLILIKLAR (DEPENDENCIES)
- Ekstra bir paket kurulumuna gerek yoktur. Mevcut `resend` ve `supabase` altyapısı kullanılacaktır.

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Veritabanı Tiplerinin (database.types.ts) Düzeltilmesi**
  - `src/lib/supabase/database.types.ts` dosyasını aç.
  - `blog_yazilari` tablosunun `Row`, `Insert` ve `Update` tanımlarını bul.
  - Eski Türkçe kolonları (`baslik`, `icerik`, `meta_aciklama`, `meta_baslik`, `one_cikan_gorsel_url`, `yayinlanma_tarihi`, `yazar_id`, `durum`) SİL.
  - Yerine migration'da olan gerçek kolonları ekle: `title` (Json), `excerpt` (Json), `content` (Json), `meta_title` (Json), `meta_description` (Json), `image_url` (string | null), `author_name` (string | null), `published_at` (string | null), `is_published` (boolean | null).

- [ ] **Adım 2: Blog Frontend Bileşenlerinin Onarılması**
  - Projedeki blog listeleme ve detay sayfalarını (`src/app/[locale]/(public)/blog/...` veya ilgili dizinler) tara.
  - Eski kolon isimlerini kullanan yerleri yeni JSONB yapısına göre güncelle. 
  - Örnek: `post.baslik` yerine `(post.title as any)?.[locale] || (post.title as any)?.de || ''` kullan.
  - `post.one_cikan_gorsel_url` yerine `post.image_url` kullan.
  - Bu adımın sonunda terminalde `npm run build` komutunun sıfır hata ile tamamlandığından emin ol.

- [ ] **Adım 3: Kargo Takip Kolonları İçin Migration**
  - `supabase/migrations/` dizininde yeni bir SQL dosyası oluştur (örn: `20261004_add_shipping_tracking.sql`).
  - `siparisler` tablosuna şu kolonları ekle:
    - `kargo_firmasi TEXT`
    - `kargo_takip_no TEXT`
    - `kargo_takip_url TEXT`
  - `database.types.ts` dosyasındaki `siparisler` tablosuna bu 3 kolonu (`string | null` olarak) manuel ekle.

- [ ] **Adım 4: Kargo E-posta Şablonunun Eklenmesi**
  - `src/lib/email.ts` dosyasını aç.
  - `sendShippingEmail` adında yeni bir fonksiyon oluştur.
  - Parametreler: `to`, `orderNo`, `courier`, `trackingNo`, `trackingUrl`.
  - HTML Şablonu (Almanca): "Ihre Bestellung wurde versandt!" (Siparişiniz kargoya verildi). Kargo firması ve takip numarasını belirgin bir kutu içinde göster. Eğer `trackingUrl` varsa "Sendung verfolgen" (Kargoyu Takip Et) adında yeşil bir buton ekle.

- [ ] **Adım 5: Kargo Server Action'ının Yazılması**
  - `src/app/actions/siparis-kargo-actions.ts` dosyasını oluştur.
  - `markOrderAsShippedAction(siparisId: string, kargoFirmasi: string, kargoTakipNo: string, kargoTakipUrl: string)` fonksiyonunu yaz.
  - İşlemler:
    1. Supabase'de siparişi güncelle: `siparis_durumu = 'Yola Çıktı'`, `kargo_firmasi`, `kargo_takip_no`, `kargo_takip_url`.
    2. Müşterinin e-posta adresini çek ve `sendShippingEmail` fonksiyonunu tetikle.
    3. `sendNotification` (notificationUtils.ts) ile müşteriye portal içi bildirim at: "Siparişiniz yola çıktı. Kargo: [Firma] - [Takip No]".

- [ ] **Adım 6: Admin Sipariş Detay UI Güncellemesi**
  - Admin sipariş detay sayfasını aç.
  - "Kargo ve Teslimat" adında yeni bir kart/bölüm ekle.
  - İçerisine 3 input koy: Kargo Firması (Select: DHL, UPS, DPD, Spedition, Eigenversand), Takip Numarası (Text), Takip Linki (Text).
  - Altına "Kargoya Verildi (Yola Çıktı) Olarak İşaretle" butonu ekle.
  - Butona tıklandığında `markOrderAsShippedAction` çalışsın, başarılı olursa `toast.success` göstersin ve sayfayı yenilesin (`router.refresh()`).

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **BUILD GÜVENLİĞİ:** Adım 1 ve 2'deki TypeScript düzeltmeleri en yüksek önceliğe sahiptir. `any` cast etmek gerekirse bile (JSONB alanları için) build'in geçmesi sağlanmalıdır. Canlıya çıkış için `npm run build` komutunun yeşil yanması zorunludur.
- **E-POSTA GÜVENLİĞİ:** `sendShippingEmail` fonksiyonu hata fırlatsa bile (örn: Resend API limiti), `markOrderAsShippedAction` fonksiyonu çökmek yerine işlemi tamamlamalı ve Admin'e "Sipariş güncellendi ancak e-posta gönderilemedi" şeklinde bir `toast.warning` dönmelidir (Graceful Degradation).
- **VERİ BÜTÜNLÜĞÜ:** Kargo firması "Eigenversand" (Kendi aracımızla teslimat) seçilirse, takip numarası ve linki zorunlu tutulmamalıdır. DHL/UPS gibi firmalar seçilirse takip numarası girilmesi teşvik edilmelidir.