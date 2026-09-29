- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-order-cancellation-integrity.md`

Hedef Modül: Sipariş İptali, Tersine Lojistik (Stock Restoration) ve Lexware Storno (Fatura İptali) Bütünlüğü.
Kapsam: Sistemin dış duvarları (CSRF, Spam, Rate Limit) ve yetkilendirme süreçleri kusursuz hale getirildi. Şimdi ERP sistemlerinin en kanayan yarası olan "İptal Süreçleri (Cancellation Flows)" ele alınacaktır. Bir sipariş iptal edildiğinde stokların geri yüklenmesi (`restore_order_stock` RPC) ve Lexware üzerinde iade faturası (Storno / Rechnungskorrektur) kesilmesi gerekmektedir. Bu aşama; "Çift İptal (Double Cancellation)" durumunda stokların iki kez geri yüklenmesini (Phantom Stock) ve Lexware'de mükerrer iade faturası kesilmesini engellemeyi (Idempotency) kapsar.
İlişkili Kritik Dosyalar:
- `supabase/migrations/20260919_atomic_stock_operations.sql` (`restore_order_stock` fonksiyonu)
- `src/lib/lexware/invoices.ts` (`cancelLexwareInvoiceForOrder` fonksiyonu)
- `src/app/actions/siparis-actions.ts` (Sipariş iptalini tetikleyen Server Action)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Idempotency & Concurrency Testing (Vitest): Bir siparişin iptal isteğinin aynı anda (veya art arda) iki kez gönderilmesi durumunda, sistemin işlemi yalnızca BİR KEZ gerçekleştirdiğinin (stokların bir kez artıp, tek bir Storno kesildiğinin) test edilmesi.
2. State Machine Validation (Vitest): Henüz faturası kesilmemiş (Lexware ID'si olmayan) bir sipariş iptal edildiğinde, sistemin Lexware API'sinde çökmeden sadece stok iadesi yaparak işlemi zarifçe (gracefully) tamamladığının testi.

- TEST SENARYOLARI (TEST CASES)

* Negative Path 1: Çift Tıklama / Mükerrer İptal (Idempotency İhlali)
1. Admin veya Müşteri, faturası kesilmiş bir siparişi iptal etmek için butona art arda iki kez tıklar (veya ağ üzerinden eşzamanlı iki istek atılır).
2. Beklenen Sonuç: Sunucu (Server Action), siparişin güncel durumunu (`siparis_durumu`) veritabanından kilitli (Row-level lock veya atomic check) olarak kontrol etmelidir. Eğer durum zaten `İptal Edildi` ise veya `lexware_storno_id` doluysa, ikinci istek anında reddedilmeli (veya sessizce başarılı dönmeli ancak işlem yapmamalıdır). Stoklar KESİNLİKLE iki kez geri yüklenmemeli ve Lexware'e ikinci bir Storno isteği GİTMEMELİDİR.

* Negative Path 2: Faturasız Siparişin İptali (Graceful Degradation)
1. Müşteri siparişi yeni vermiştir (Durum: `Beklemede`), henüz Lexware faturası (`lexware_invoice_id`) oluşturulmamıştır.
2. Sipariş iptal edilir.
3. Beklenen Sonuç: Sistem `cancelLexwareInvoiceForOrder` fonksiyonunu çağırmadan önce `lexware_invoice_id` kontrolü yapmalıdır. Fatura yoksa, Lexware API'sine istek atılmamalı, sadece `restore_order_stock` çalıştırılarak stoklar iade edilmeli ve sipariş durumu `İptal Edildi` yapılmalıdır. Sistem 500 hatası fırlatmamalıdır.

* Happy Path: Kusursuz İptal ve Storno Akışı
1. Faturası kesilmiş (`lexware_invoice_id` mevcut) bir sipariş iptal edilir.
2. Beklenen Sonuç: `restore_order_stock` başarıyla çalışır. `cancelLexwareInvoiceForOrder` Lexware'e istek atar, dönen `creditNoteId` veritabanına `lexware_storno_id` olarak kaydedilir. Sipariş durumu `İptal Edildi`, fatura durumu `iptal_edildi` olarak güncellenir.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: `src/app/actions/siparis-actions.ts` (veya iptal işlemini yapan dosya) içindeki iptal fonksiyonunu aç. İşlemin en başında siparişin durumunu kontrol et: `if (siparis.siparis_durumu === 'İptal Edildi') return { success: true, message: 'Zaten iptal edildi' };`.
- [ ] Adım 2: `src/lib/lexware/invoices.ts` içindeki `cancelLexwareInvoiceForOrder` fonksiyonunu kontrol et. Eğer siparişin `lexware_storno_id` değeri zaten varsa, Lexware'e tekrar istek atmadan mevcut ID'yi dön (Idempotency). Eğer `lexware_invoice_id` yoksa, hata fırlatmak yerine `{ skipped: true }` gibi bir yanıt dönerek akışın devam etmesini sağla.
- [ ] Adım 3: `__tests__/order-cancellation-idempotency.test.ts` dosyasını oluştur. `Promise.all` kullanarak aynı sipariş ID'si ile iptal action'ını eşzamanlı iki kez çağır.
- [ ] Adım 4: Test içerisinde `vi.spyOn` kullanarak `restore_order_stock` RPC'sinin ve `lexwareFetch` (veya `cancelLexwareInvoiceForOrder`) fonksiyonunun SADECE BİR KEZ çağrıldığını (`toHaveBeenCalledTimes(1)`) `expect` ile doğrula.
- [ ] Adım 5: Aynı test dosyasında, `lexware_invoice_id`'si `null` olan bir sipariş için iptal action'ını çağır ve Lexware API'sinin tetiklenmediğini, ancak stok iadesinin yapıldığını doğrula.
- [ ] Adım 6: Testleri çalıştır (`npm run test`).

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. HAYALİ STOK (PHANTOM STOCK) YASAĞI: Çift iptal durumunda stokların iki kez artması, şirketin depoda olmayan bir ürünü satmasına (Overselling) neden olur. İptal işlemi kesinlikle Idempotent (tekrarlanabilir ama sonucu değiştirmeyen) olmalıdır.
2. LEXWARE FATURA BÜTÜNLÜĞÜ: Alman muhasebe kanunlarına (GoBD) göre, kesilmiş bir faturanın iptali ancak "Rechnungskorrektur / Storno" belgesi ile mümkündür. Lexware'de aynı fatura için iki kez Storno kesilmesi muhasebeyi bozar. Bu nedenle `lexware_storno_id` kontrolü hayatidir.
3. MOCK ZORUNLULUĞU: Testler sırasında Lexware API'sine kesinlikle gerçek iptal (Storno) isteği atılmamalıdır. `lexwareFetch` fonksiyonu Vitest ile izole edilmelidir.