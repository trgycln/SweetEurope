- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Hedef Modül: Müşteri Portalı (Customer & Sub-dealer Portal)
Kapsam: B2B müşterilerinin ve alt bayilerin (Alt Bayi) sisteme girişi, katalog görüntüleme, sepete ürün ekleme (stok ve kademeli fiyat kontrolü), sipariş oluşturma, finansal özet (açık faturalar/bakiyeler) ve favoriler/hızlı sipariş yönetimi.
İlişkili Kritik Dosyalar:
- `src/contexts/PortalContext.tsx` (Sepet state yönetimi, stok kontrolleri)
- `src/lib/pricingUtils.ts` & `src/lib/pricing/hub-pricing-engine.ts` (B2B kademeli fiyatlandırma mantığı)
- `src/lib/shippingUtils.ts` (Kargo ve KDV hesaplamaları)
- `src/middleware.ts` (Rol bazlı rota koruması)
- `supabase/migrations/create_siparisler_firmalar_rls.sql` (Veri izolasyonu)
- `src/lib/portalLabels.ts` (Çoklu dil desteği)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Unit Testing (Vitest): `pricingUtils.ts`, `shippingUtils.ts` ve `PortalContext.tsx` içindeki iş mantığının (fiyat kademeleri, stok sınırları, KDV hesaplamaları) izole testi.
2. E2E Testing (Playwright): Müşteri portalı kullanıcı akışlarının (Login -> Katalog -> Sepet -> Sipariş -> Dashboard) tarayıcı üzerinde simülasyonu.
3. Security & Integration Testing (Supabase/Vitest): RLS (Row Level Security) politikalarının test edilmesi. Müşteri A'nın, Müşteri B'ye ait verileri göremediğinin kanıtlanması.

- TEST SENARYOLARI (TEST CASES)

* Happy Path (Sorunsuz Akış)
1. Müşteri başarılı bir şekilde login olur ve `/portal/dashboard` sayfasına yönlendirilir.
2. Dashboard'da müşteriye ait doğru finansal özet (açık bakiye, bekleyen siparişler) görüntülenir.
3. Katalogdan bir ürün seçilir, sepete eklenir (varsayılan 1 koli).
4. Sepetteki ürün miktarı 5 koliye çıkarıldığında, birim fiyat otomatik olarak "Toptancı" (5+ koli) kademesine düşer.
5. Sipariş başarıyla tamamlanır, veritabanında `siparisler` ve `siparis_detay` tablolarına doğru `firma_id` ile kayıt atılır.

* Negative Path (Hatalı Girişler ve Yetkisiz Erişimler)
1. Müşteri rolündeki bir kullanıcı `/admin` veya `/admin/dashboard` rotalarına erişmeye çalışır (Middleware tarafından `/portal/dashboard` veya login'e geri atılmalıdır).
2. Müşteri, URL'deki ID'yi değiştirerek başka bir firmaya ait sipariş detayına (`/portal/siparisler/[baska-id]`) erişmeye çalışır (RLS tarafından engellenmeli, 404 veya boş data dönmelidir).
3. Sepete eklenmek istenen miktar, ürünün mevcut `stok_miktari` değerinden fazladır (Sistem uyarı vermeli ve miktarı maksimum stok seviyesine çekmelidir - `PortalContext.tsx` kuralı).
4. Müşteri, sepet miktarını manuel olarak negatif bir değere veya 0'a çekmeye çalışır (Ürün sepetten silinmeli veya işlem reddedilmelidir).

* Edge Cases (Sınır Durumlar ve Kritik Senaryolar)
1. Fiyat Kademesi Sınırı: Sepette 4 koli varken fiyat X, 5 koli yapıldığında fiyat Y olmalıdır. 5 koliden 4 koliye düşürüldüğünde fiyat tekrar X'e yükselmelidir.
2. Alt Bayi Fiyatlandırması: Giriş yapan kullanıcı "Alt Bayi" rolündeyse, miktar ne olursa olsun (1 koli bile olsa) her zaman en düşük fiyatı (`satis_fiyati_alt_bayi`) görmelidir.
3. Eşzamanlı Stok Tüketimi: Müşteri sepette ürünü bekletirken, başka bir işlem (veya admin) stoku sıfırlar. Müşteri "Siparişi Tamamla" dediğinde sistem stok yetersizliği hatası fırlatmalı ve siparişi oluşturmamalıdır.
4. Kargo ve KDV Yuvarlama: Gıda ürünleri (%7 KDV) ve kargo ücreti (%7 KDV) hesaplanırken virgülden sonraki küsuratlar (örn: 0.005) Alman muhasebe standartlarına göre doğru yuvarlanmalıdır (`Math.round(val * 100) / 100`).

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: Test ortamı hazırlığı. `vitest.config.ts` ve `playwright.config.ts` dosyalarını kontrol et. Test veritabanı bağlantılarını (mock) ayarla.
- [ ] Adım 2: `__tests__/pricingUtils.test.ts` dosyasını oluştur. `hesaplaBirimFiyat` ve `hesaplaSepetSatiri` fonksiyonları için Müşteri (1-4 koli), Toptancı (5+ koli) ve Alt Bayi senaryolarını test et.
- [ ] Adım 3: `__tests__/PortalContext.test.tsx` dosyasını oluştur. `addToWarenkorb` ve `updateWarenkorbMenge` fonksiyonlarında stok aşımı (stok_miktari) durumunda `toast.warning` tetiklendiğini ve miktarın düzeltildiğini test et.
- [ ] Adım 4: `tests/e2e/portal-auth-rls.spec.ts` dosyasını oluştur. İki farklı test kullanıcısı (Müşteri A ve Müşteri B) ile login ol. Müşteri A'nın token'ı ile Müşteri B'nin siparişlerini çekmeyi dene (Supabase RLS test).
- [ ] Adım 5: `tests/e2e/portal-checkout.spec.ts` dosyasını oluştur. Login -> Katalog -> Sepete Ekle -> Miktar Değiştir (Fiyat düşüşünü doğrula) -> Siparişi Tamamla akışını Playwright ile simüle et.
- [ ] Adım 6: Testleri çalıştır (`npm run test` ve `npm run test:e2e`).
- [ ] Adım 7: Başarısız olan testler varsa, ilgili kaynak kodlarda (özellikle `PortalContext.tsx` ve `middleware.ts`) gerekli düzeltmeleri yap ve testler yeşil olana kadar döngüyü tekrarla.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. CANLI VERİTABANINA DOKUNMA: Tüm testler mock verilerle veya izole edilmiş lokal/test Supabase projesi üzerinde çalıştırılmalıdır.
2. STRIPE GÜVENLİĞİ: Testler sırasında kesinlikle gerçek Stripe API anahtarları kullanılmayacaktır. `isNonProductionEnv` kontrolü aktif tutulmalı ve sadece `sk_test_` anahtarları veya mock fonksiyonlar kullanılmalıdır.
3. RLS İHLALİ YASAKTIR: Testleri geçirmek için Supabase RLS politikalarını (Row Level Security) esnetme veya `service_role` key kullanarak müşteri işlemlerini bypass etme. Müşteri işlemleri her zaman `anon` veya `authenticated` JWT token ile yapılmalıdır.
4. STOK KORUMASI: Sepet işlemlerinde stok kontrolü sadece frontend'de (`PortalContext`) bırakılmamalı, sipariş oluşturma anında backend/veritabanı seviyesinde de (örn: `deduct_single_product_stock` RPC'si) test edilmelidir.