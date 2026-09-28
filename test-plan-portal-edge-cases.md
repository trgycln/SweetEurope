Hedef Modül: Müşteri Portalı - Kritik Sınır Durumları (Edge Cases), Eşzamanlılık (Concurrency) ve Finansal Hassasiyet Doğrulaması.
Kapsam: Temel E2E ve Unit testleri başarıyla tamamlanmış ve locale (dil) yönlendirme sorunları çözülmüştür. Bu aşama (Faz 2), sistemin finansal ve lojistik bütünlüğünü tehdit edebilecek "Race Condition" (Yarış Durumu), "Alt Bayi Fiyat İzolasyonu" ve "KDV Yuvarlama Hassasiyeti" senaryolarının kesin olarak test edilmesini kapsar.
İlişkili Kritik Dosyalar:
supabase/migrations/20260919_atomic_stock_operations.sql (Atomik stok düşümü)
src/lib/pricingUtils.ts (Fiyat ve yuvarlama mantığı)
src/lib/shippingUtils.ts (Kargo KDV hesaplamaları)
TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
Concurrency/Integration Testing (Vitest + Supabase Local): Aynı anda gelen iki sipariş isteğinin veritabanı kilitleri (Row-level locks / FOR UPDATE) ile nasıl yönetildiğinin testi.
Unit Testing (Vitest): Alman muhasebe standartlarına (Kaufmännisches Runden) uygun KDV ve brüt tutar yuvarlama testleri.
E2E Role Testing (Playwright): "Alt Bayi" rolünün fiyatlandırma motorundaki mutlak üstünlüğünün UI üzerinden kanıtlanması.
TEST SENARYOLARI (TEST CASES)
Edge Case 1: Eşzamanlı Stok Tüketimi (Race Condition)
Veritabanında stok_miktari = 5 olan bir ürün belirlenir.
İki farklı müşteri (veya aynı müşteri iki farklı sekmeden) aynı anda 4'er adetlik sipariş oluşturma isteği (API Call) gönderir.
Beklenen Sonuç: İlk istek başarılı olmalı ve stok 1'e düşmelidir. İkinci istek veritabanı seviyesinde (örn: deduct_single_product_stock fonksiyonu) reddedilmeli ve "Yetersiz Stok" hatası dönmelidir. Stok asla eksiye (-3) düşmemelidir.
Edge Case 2: Alt Bayi (Sub-dealer) Fiyat İzolasyonu
"Alt Bayi" rolüne sahip bir kullanıcı ile login olunur.
Sepete 1 koli ürün eklenir.
Beklenen Sonuç: Sistem 1-4 koli standart fiyatını DEĞİL, doğrudan satis_fiyati_alt_bayi (en düşük fiyat) değerini uygulamalıdır. Miktar 10 koliye çıkarılsa bile fiyat değişmemeli, sabit alt bayi fiyatı kalmalıdır.
Edge Case 3: Finansal Yuvarlama Hassasiyeti (Kaufmännisches Runden)
Net tutarı 10.005 € olan bir sepet hesaplaması simüle edilir.
Beklenen Sonuç: KDV (%7) ve Brüt tutar hesaplanırken JavaScript'in floating-point hataları (örn: 0.1 + 0.2 = 0.30000000000000004) engellenmeli, tutar tam olarak 10.01 €'ya yuvarlanmalıdır.
ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

Adım 1: __tests__/concurrency.test.ts dosyasını oluştur. Promise.all kullanarak aynı ürüne eşzamanlı iki sipariş isteği at ve Supabase RPC'sinin (deduct_single_product_stock veya ilgili sipariş fonksiyonu) birini reddettiğini expect ile doğrula.

Adım 2: __tests__/financial-rounding.test.ts dosyasını oluştur. pricingUtils.ts ve shippingUtils.ts içindeki hesaplamalara küsuratlı (örn: 15.455, 9.995) mock veriler vererek, sonuçların tam olarak 2 ondalık basamağa (15.46, 10.00) yuvarlandığını test et.

Adım 3: tests/e2e/portal-subdealer-pricing.spec.ts dosyasını oluştur. Alt Bayi kullanıcısı ile giriş yap, sepetteki miktarı 1'den 10'a kadar değiştir ve birim fiyatın hiçbir kademede değişmediğini (sabit kaldığını) doğrula.

Adım 4: Testleri çalıştır (npm run test ve npm run test:e2e).

Adım 5: Eğer eşzamanlılık testinde stok eksiye düşerse, Supabase migration dosyasındaki FOR UPDATE kilidinin veya sipariş oluşturma RPC'sinin doğru çalıştığından emin ol ve kodu onar.
KATI KURALLAR VE GÜVENLİK KISITLAMALARI
JAVASCRIPT MATH KISITLAMASI: Finansal hesaplamalarda asla ham * veya / operatörlerinin sonuçlarına güvenme. Her zaman Math.round((deger + Number.EPSILON) * 100) / 100 veya benzeri güvenli bir yuvarlama fonksiyonu kullanıldığını assert et.
VERİTABANI KİLİTLERİ: Race condition testinde, Supabase client'ın mocklanması yerine, lokal Supabase instance'ı üzerinde gerçek RPC çağrısı yapılması tercih edilmelidir (Eğer CI/CD ortamı buna izin veriyorsa). Aksi takdirde transaction mantığını mocklayarak test et.
ROL BAZLI FİYAT KORUMASI: Alt bayi testinde, frontend'in fiyatı manipüle etmediğinden emin olmak için, siparişin backend'e gönderildiği payload'daki tutarın da backend tarafından yeniden hesaplanıp doğrulandığını kontrol et.