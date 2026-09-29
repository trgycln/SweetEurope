- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-supplier-order-pipeline.md`
Hedef Modül: Tedarikçi Sipariş Planı (Supply Chain Pipeline / Import Batches)
Hedef URL: `/tr/admin/urun-yonetimi/tedarikci-siparis-plani` ve alt detay sayfaları (`/[id]`)
Kapsam: B2B ERP standartlarına uygun olarak tasarlanan 4 aşamalı (Taslak -> Yolda -> Maliyetlendirme -> Mal Kabul) tedarik zinciri modülünün uçtan uca test edilmesi ve onarılması. Bu modülde kullanıcı sadece "Koli Sayısı" girer; ağırlık, adet, LUCID (Ambalaj Sicili) maliyeti ve çift kademeli indirimler Master Data (`urunler` tablosu) üzerinden otomatik hesaplanır. Mal kabul işlemi (Stok artışı ve loglama) kesinlikle JavaScript ile değil, Supabase RPC (`complete_import_batch`) üzerinden atomik olarak yapılmalıdır.
İlişkili Kritik Dosyalar:
- `src/lib/import-batch-utils.ts` (Maliyet, indirim, LUCID ve yuvarlama motoru)
- `supabase/migrations/20260928_supply_chain_pipeline.sql` (Atomik mal kabul RPC'si ve log tabloları)
- `src/app/actions/import-batch-actions.ts` (Sunucu eylemleri)
- `src/app/[locale]/admin/urun-yonetimi/tedarikci-siparis-plani/page.tsx` & `[id]/page.tsx` (UI/UX)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Unit Testing (Vitest): `import-batch-utils.ts` içindeki `kaufmannRunden` (ticari yuvarlama), çift kademeli indirim (`calculateDiscountedPrice`), LUCID maliyeti (`calculateLucidCost`) ve Master Data hesaplamalarının (Koli -> Adet -> Ağırlık) izole testi.
2. Integration Testing (Vitest + Supabase): `complete_import_batch` RPC fonksiyonunun veritabanı seviyesinde test edilmesi. Stokların doğru artması, `urun_stok_hareket_loglari` ve `tedarikci_fiyat_loglari` tablolarına doğru kayıtların atılması.
3. E2E Testing (Playwright): UI üzerinden 4 sekmeli (Sipariş -> Yolda -> Maliyetlendirme -> Belgeler) akışın simüle edilmesi. Kullanıcının manuel ağırlık/fiyat giremediğinin (Read-Only UI) doğrulanması.

- TEST SENARYOLARI (TEST CASES)

* Happy Path (Kusursuz Tedarik Akışı)
1. Admin yeni bir ithalat partisi (Draft) oluşturur.
2. Partiye bir ürün ekler ve sadece "Koli Sayısı"nı (örn: 10) girer.
3. Sistem, `urunler` tablosundaki `koli_ici_adet` ve `birim_agirlik_kg` verilerini kullanarak Toplam Adet ve Toplam Ağırlığı otomatik hesaplar.
4. %20 ve %8 çift kademeli indirim uygulanır, sistem `indirimli_alis_fiyati`nı doğru hesaplar.
5. Maliyetlendirme sekmesinde, toplam ağırlık üzerinden LUCID maliyeti (kg * 0.02 €) otomatik olarak `dagitilan_ozel_gider_eur` içine eklenir.
6. "Mal Kabulü Tamamla" butonuna basılır. RPC çalışır; ürün stoku artar, stok hareket logu yazılır ve tedarikçi fiyat logu (standart vs gerçek maliyet sapması) oluşturulur.

* Negative Path (Hatalı Girişler ve Güvenlik İhlalleri)
1. Payload Manipülasyonu: Kötü niyetli bir admin/istek, API'ye `toplam_agirlik_kg` veya `birim_alis_fiyati_orijinal` değerlerini manuel olarak değiştirip gönderir. Sistem bu değerleri reddetmeli ve Master Data üzerinden sunucuda yeniden hesaplamalıdır.
2. Çift Mal Kabulü (Double Submit): Zaten "Tamamlandı" statüsünde olan bir ithalat partisi için tekrar `complete_import_batch` RPC'si çağrılır. Sistem işlemi reddetmeli ve stokları ikinci kez artırmamalıdır.
3. Eksik Master Data: `birim_agirlik_kg` veya `koli_ici_adet` değeri `null` olan bir ürün eklendiğinde sistem çökmeksizin güvenli varsayılan değerler (fallback = 0 veya 1) kullanmalıdır.

* Edge Cases (Sınır Durumlar ve Hassasiyet)
1. Ticari Yuvarlama (Kaufmännisches Runden): 10.005 € gibi küsuratlı indirim veya LUCID hesaplamaları tam olarak 10.01 €'ya yuvarlanmalıdır (JavaScript floating point hataları tolere edilmelidir).
2. Kısmi Teslimat Güncellemesi: Sipariş "Maliyetlendirme" aşamasındayken, depoya eksik ürün geldiği fark edilir. Admin koli sayısını 10'dan 8'e düşürür. Sistem tüm navlun, gümrük ve LUCID dağılımlarını anında yeni ağırlığa göre yeniden hesaplamalıdır.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [x] Adım 1: `__tests__/import-batch-utils.test.ts` dosyasını oluştur. `calculateDiscountedPrice`, `calculateLucidCost`, `calculateMiktarAdet` ve `calculateToplamAgirlikKg` fonksiyonları için Unit testleri yaz. Ticari yuvarlama hatalarını kontrol et.
- [x] Adım 2: `__tests__/supply-chain-rpc.test.ts` dosyasını oluştur. Supabase test client'ı ile örnek bir ithalat partisi oluştur. `complete_import_batch` RPC'sini çağır.
- [x] Adım 3: RPC testinde şunları `expect` ile doğrula: `urunler.stok_miktari` doğru arttı mı? `urun_stok_hareket_loglari` tablosuna kayıt atıldı mı? `tedarikci_fiyat_loglari` tablosunda sapma yüzdesi doğru hesaplandı mı?
- [x] Adım 4: `tests/e2e/supplier-order-pipeline.spec.ts` dosyasını oluştur. Playwright ile `/tr/admin/urun-yonetimi/tedarikci-siparis-plani` sayfasına git. Yeni parti oluştur, koli sayısı gir, sekmeler arası geçiş yap ve "Mal Kabulü Tamamla" butonuna tıkla.
- [x] Adım 5: Testleri çalıştır (`npm run test` ve `npm run test:e2e`).
- [x] Adım 6: Eğer UI'da kullanıcıdan ağırlık veya birim fiyat girmesini isteyen inputlar varsa, bunları `readOnly` veya `disabled` yap. Sadece "Koli Sayısı", "İndirim 1" ve "İndirim 2" alanlarını düzenlenebilir bırak.
- [x] Adım 7: `src/app/actions/import-batch-actions.ts` içindeki kayıt fonksiyonunu (örn: `saveBatchItems`) kontrol et. Frontend'den gelen ağırlık/fiyat verilerini yoksayarak `buildBatchItemInsertRows` fonksiyonu ile sunucuda Master Data üzerinden yeniden hesaplat.
- [x] Adım 8: Hata veren testleri düzelt ve tüm pipeline'ın yeşil (Pass) olmasını sağla.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. MASTER DATA DRIVEN KURALI: İstemciden (Frontend) gelen `toplam_agirlik_kg`, `miktar_adet` veya `birim_alis_fiyati_orijinal` değerlerine KESİNLİKLE güvenilmeyecektir. Bu değerler sunucu tarafında (Server Action) `urunler` tablosundan çekilen verilerle yeniden hesaplanmalıdır.
2. ATOMİK STOK İŞLEMİ: Stok artırımı kesinlikle JavaScript ile (`mevcut_stok + yeni_stok`) yapılmayacak, sadece `complete_import_batch` RPC'si kullanılarak veritabanı seviyesinde kilitlenerek (Row-level lock) yapılacaktır.
3. CANLI VERİTABANI KORUMASI: Testler sırasında gerçek tedarikçi verileri veya canlı stoklar bozulmamalıdır. Testler mock verilerle veya izole test veritabanında çalıştırılmalıdır.
4. YUVARLAMA HASSASİYETİ: Tüm finansal ve ağırlık hesaplamalarında `kaufmannRunden` (veya eşdeğeri `Math.round((val + Number.EPSILON) * 100) / 100`) fonksiyonu kullanılmak zorundadır.