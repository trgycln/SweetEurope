BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: test-plan-backend-security.md
Hedef Modül: Backend Sipariş İşleme ve Güvenlik (Order Processing & Payload Security)
Kapsam: IDE'nin bir önceki test aşamasında tespit ettiği kritik güvenlik açığının (Frontend payload manipülasyonu ile fiyat değiştirme) kapatılması. İstemciden (client) gelen fiyat verilerine olan güvenin sıfırlanması (Zero Trust) ve tüm sepet/fiyat/kargo hesaplamalarının sunucu tarafında (Server-side) veritabanındaki güncel verilerle yeniden yapılarak doğrulanması.
İlişkili Kritik Dosyalar:
src/app/actions/siparis-actions.ts (veya siparişin oluşturulduğu ilgili Server Action dosyası)
src/lib/pricingUtils.ts (Sunucu tarafında fiyat hesaplama mantığı)
src/lib/shippingUtils.ts (Sunucu tarafında kargo hesaplama mantığı)
src/lib/supabase/server.ts (Güvenli oturum ve rol kontrolü)
TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
Security Patching (Backend Refactoring): Sipariş oluşturma fonksiyonunun, frontend'den gelen o_anki_satis_fiyati, toplam_tutar_net, toplam_tutar_brut gibi finansal verileri tamamen yok sayacak (override) şekilde yeniden yazılması.
Integration Testing (Vitest): Kötü niyetli bir kullanıcının (Malicious User) API'ye veya Server Action'a manipüle edilmiş bir payload (örn: birim fiyatı 0.01 €) göndermesinin simüle edilmesi ve backend'in bu girişimi engelleyerek gerçek veritabanı fiyatlarıyla işlemi tamamladığının (veya reddettiğinin) test edilmesi.
TEST SENARYOLARI (TEST CASES)
Negative Path (Payload Manipülasyonu - Fiyat Sahteciliği)
Kötü niyetli bir müşteri, frontend üzerinden sepeti onaylarken ağ (network) isteğini durdurur ve payload içindeki birim_fiyat değerini 0.01, toplam_tutar_net değerini ise 0.05 olarak değiştirip sunucuya gönderir.
Beklenen Sonuç: Sunucu bu fiyatları DİKKATE ALMAMALIDIR. Sunucu, gönderilen urun_id'leri veritabanından çekmeli, kullanıcının rolünü (Müşteri, Alt Bayi vb.) doğrulamalı, hesaplaBirimFiyat ile gerçek fiyatı bulmalı ve siparişi gerçek tutarlar üzerinden (örn: 150.00 €) oluşturmalıdır. Eğer tutar uyuşmazlığı için bir hata fırlatma mantığı kurulduysa, işlem "Geçersiz Fiyat" hatasıyla reddedilmelidir.
Happy Path (Sunucu Tarafı Rol Bazlı Fiyatlandırma)
"Alt Bayi" rolündeki bir kullanıcı 1 koli ürün siparişi gönderir.
Beklenen Sonuç: Sunucu, kullanıcının oturumundan (session) rolünü "Alt Bayi" olarak tespit eder. Veritabanından ürünü çeker, satis_fiyati_alt_bayi değerini uygular, kargo ve KDV'yi (önceki adımda düzeltilen Scientific Notation yuvarlama mantığıyla) hesaplar ve siparişi kuruşu kuruşuna doğru kaydeder.
ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

Adım 1: src/app/actions/siparis-actions.ts (veya ilgili sipariş oluşturma action/api dosyası) dosyasını aç.

Adım 2: Fonksiyonun içine "Zero Trust" mantığını entegre et. Frontend'den gelen items (sepet kalemleri) içindeki urun_id'leri bir diziye al ve Supabase üzerinden bu ürünlerin güncel fiyat/stok/koli bilgilerini tek bir sorguyla (in('id', productIds)) çek.

Adım 3: Supabase Auth üzerinden işlemi yapan kullanıcının ID'sini ve profiller tablosundan güncel rol bilgisini güvenli bir şekilde (server-side) al.

Adım 4: Frontend'den gelen her bir sepet kalemi için hesaplaSepetSatiri veya hesaplaBirimFiyat fonksiyonlarını kullanarak gerçek fiyatı sunucuda hesapla. Frontend'den gelen fiyatı tamamen ez (override).

Adım 5: Yeni hesaplanan net tutarlar üzerinden calculateShipping fonksiyonunu çağırarak kargo ve KDV tutarlarını sunucuda yeniden hesapla. Toplam brüt tutarı belirle.

Adım 6: siparisler ve siparis_detay tablolarına yapılacak insert işleminde, sadece sunucuda hesaplanan bu güvenilir (trusted) değerleri kullan.

Adım 7: __tests__/security-order-payload.test.ts dosyasını oluştur. Server action'ı mocklayarak manipüle edilmiş bir payload gönder ve veritabanına yazılacak olan objenin (mock insert argümanlarının) manipüle edilmiş fiyatları değil, gerçek fiyatları içerdiğini expect ile doğrula.

Adım 8: Testleri çalıştır ve güvenlik açığının tamamen kapandığından emin ol.
KATI KURALLAR VE GÜVENLİK KISITLAMALARI
ZERO TRUST MİMARİSİ: İstemciden (tarayıcıdan) gelen hiçbir finansal veriye (fiyat, kdv, kargo ücreti, toplam tutar) güvenilmeyecektir. İstemci sadece urun_id ve miktar (adet/koli) gönderme yetkisine sahiptir.
YUVARLAMA HASSASİYETİ: Sunucu tarafında yeniden hesaplama yapılırken, bir önceki aşamada düzeltilen Number(Math.round(Number(val + 'e2')) + 'e-2') mantığının kullanıldığından kesinlikle emin ol.
VERİTABANI BÜTÜNLÜĞÜ: Sipariş detaylarına (siparis_detay) kayıt atılırken, o anki geçerli alış fiyatı (o_anki_alis_fiyati) gibi kârlılık raporlarını etkileyecek metriklerin de veritabanından taze çekilip kaydedildiğini garanti altına al.