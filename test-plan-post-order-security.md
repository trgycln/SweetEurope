- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Hedef Modül: Sipariş Sonrası Entegrasyonlar (Lexware, Email) ve Doküman Güvenliği (IDOR Koruması).
Kapsam: Yarın gerçekleşecek canlı lansman öncesi son güvenlik ve dayanıklılık (resilience) kontrolleri. Müşterilerin birbirlerinin faturalarına/belgelerine erişiminin (IDOR) kesin olarak engellenmesi ve 3. parti servislerin (Lexware API, Resend) çökmesi durumunda sipariş verisinin kaybolmamasının garanti altına alınması.
İlişkili Kritik Dosyalar:
- `src/app/api/invoices/[siparisId]/pdf/route.ts` (veya ilgili fatura indirme endpoint'i)
- `src/lib/lexware/invoices.ts` (Lexware fatura oluşturma mantığı)
- `src/lib/email.ts` (Sipariş onay e-postaları)
- `supabase/migrations/belgeler_table.sql` & `storage_policies.sql` (Doküman RLS politikaları)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Security Testing (IDOR - Insecure Direct Object Reference): API endpoint'lerine yetkisiz parametreler göndererek veri sızıntısı (Data Leak) testleri.
2. Resilience & Error Handling Testing (Vitest): Dış API'lerin (Lexware) hata fırlattığı (500 Internal Server Error) durumlarda sistemin siparişi rollback yapıp yapmadığının veya güvenli bir şekilde "Fatura Bekliyor" statüsüne alıp almadığının testi.

- TEST SENARYOLARI (TEST CASES)

* Edge Case 1: Fatura İndirme Endpoint'inde IDOR Güvenlik Açığı
1. "Müşteri A" rolündeki bir kullanıcı sisteme giriş yapar.
2. Müşteri A, "Müşteri B"ye ait olan bir siparişin ID'sini ele geçirir ve tarayıcıdan `/api/invoices/[Musteri_B_Siparis_ID]/pdf` adresine istek atar.
3. Beklenen Sonuç: API, faturayı Lexware'den çekmeden ÖNCE Supabase üzerinden bu siparişin (`siparisId`) istek atan kullanıcının `firma_id`'sine ait olup olmadığını kontrol etmelidir. Ait değilse anında `403 Forbidden` veya `404 Not Found` dönmeli, kesinlikle PDF dosyasını sızdırmamalıdır.

* Edge Case 2: Lexware API Çökmesi (Resilience)
1. Müşteri siparişi başarıyla tamamlar, veritabanına sipariş kaydedilir.
2. Sistem arka planda Lexware'e fatura oluşturma isteği atar (`createLexwareInvoiceForOrder`), ancak Lexware API o an çökmüştür (Timeout veya 500 döner).
3. Beklenen Sonuç: Sipariş işlemi tamamen iptal OLMAMALIDIR (Müşteri "Siparişiniz alınamadı" hatası görmemelidir). Sipariş veritabanında kalmalı, `fatura_durumu` = 'bekliyor' veya 'hata' olarak işaretlenmeli ve adminlere bildirim gitmelidir. Müşteriye siparişin alındığına dair başarılı ekran gösterilmelidir.

* Edge Case 3: Doküman (Belgeler) RLS İzolasyonu
1. Müşteri A, portal üzerinden `/portal/belgeler` sayfasına girer.
2. Beklenen Sonuç: Sadece `firma_id`'si kendi firmasına eşit olan veya `gizli = false` olup genele açık olan belgeleri görebilmelidir. Diğer firmalara ait sözleşme, fiyat listesi veya özel belgeler kesinlikle listelenmemelidir.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: Fatura indirme API route'unu (`src/app/api/invoices/[siparisId]/pdf/route.ts` veya benzeri) kontrol et. Eğer siparişin sahibini doğrulayan bir güvenlik kontrolü yoksa, Supabase Server Client ile `siparisler` tablosundan `firma_id` kontrolü ekle.
- [ ] Adım 2: `__tests__/security-idor-invoices.test.ts` dosyasını oluştur. Müşteri A'nın oturumuyla (mock session), Müşteri B'nin sipariş ID'sine istek atıldığında API'nin 403/404 döndüğünü test et.
- [ ] Adım 3: Sipariş oluşturma action'ını (`siparis-actions.ts`) kontrol et. Lexware fatura oluşturma veya E-posta gönderme işlemleri `try/catch` bloğu içinde mi? Eğer bu servisler hata verirse ana sipariş akışını (veritabanı kaydını) bozmadığından emin ol. Gerekirse bu işlemleri asenkron (fire-and-forget) veya güvenli try/catch içine al.
- [ ] Adım 4: `__tests__/resilience-external-api.test.ts` dosyasını oluştur. Lexware fetch fonksiyonunu mocklayarak hata fırlatmasını sağla ve siparişin Supabase'e başarıyla kaydedildiğini doğrula.
- [ ] Adım 5: Testleri çalıştır (`npm run test`).

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. IDOR KESİNLİKLE AFFEDİLMEZ: B2B sistemlerinde başka bir firmanın faturasını (aldığı özel fiyatları, indirimleri) görmek en büyük güvenlik ihlalidir. API route'larında sadece `auth.getUser()` yapmak yetmez, çekilmek istenen kaynağın (`siparisler.firma_id`) kullanıcının `firma_id`'si ile eşleştiği KESİNLİKLE doğrulanmalıdır.
2. FIRE-AND-FORGET BİLDİRİMLER: E-posta (Resend) ve Fatura (Lexware) işlemleri, müşterinin ödeme/sipariş tamamlama hızını yavaşlatmamalıdır. Bu işlemler ana veritabanı transaction'ı bittikten sonra çalıştırılmalıdır.