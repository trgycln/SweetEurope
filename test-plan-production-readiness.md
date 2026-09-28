BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: test-plan-production-readiness.md (Lütfen bu içeriği kök dizinde YENİ bir dosya olarak oluştur ve IDE'ye okut.)
Hedef Modül: Canlı Ortam Hazırlığı (Production Readiness), Kötüye Kullanım Koruması (Abuse Prevention) ve Ödeme Güvenliği (Stripe Webhooks).
Kapsam: Yarın gerçekleşecek canlı lansman öncesindeki SON AŞAMA (Faz 5). Sistem işlevsel olarak kusursuz çalışıyor, ancak internete açıldığı an botların ve kötü niyetli kişilerin hedefi olacaktır. Bu aşama; Yapay Zeka (Gemini/Groq) maliyetlerini patlatacak spam isteklerin engellenmesini ve Stripe ödeme altyapısındaki Webhook imza (signature) doğrulamalarının test edilmesini kapsar.
İlişkili Kritik Dosyalar:
src/app/api/chat/route.ts veya src/lib/ai/sales-agent.ts (Yapay Zeka API uç noktası)
src/app/api/webhooks/stripe/route.ts (Stripe ödeme bildirim uç noktası - varsa)
src/lib/stripe.ts (Stripe yapılandırması)
TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
Rate Limiting & Abuse Testing (Vitest/Playwright): AI endpoint'ine ve sipariş oluşturma fonksiyonlarına ardışık (spam) istekler atılarak sunucunun bu istekleri reddedip reddetmediğinin (Throttling/Rate Limiting) testi.
Webhook Security Testing (Vitest): Stripe'tan geliyormuş gibi davranan sahte (unsigned) ödeme onay isteklerinin sistem tarafından reddedildiğinin kanıtlanması.
TEST SENARYOLARI (TEST CASES)
Edge Case 1: Yapay Zeka (AI) Maliyet Sömürüsü (Spam/Abuse)
Kötü niyetli bir bot veya kullanıcı, AI Chat endpoint'ine saniyede 10 istek atarak API kotalarını (Gemini/Groq) tüketmeye çalışır.
Beklenen Sonuç: Sunucu, aynı IP'den veya aynı Session'dan gelen ardışık istekleri tespit etmeli (örneğin 10 saniyede maksimum 3 istek) ve sınırı aşan isteklere 429 Too Many Requests hatası dönmelidir. AI API'sine gereksiz çağrı yapılmamalıdır.
Edge Case 2: Sahte Ödeme Bildirimi (Stripe Webhook Spoofing)
Saldırgan, siparişini "Ödendi" (Paid) statüsüne geçirmek için sistemin Stripe Webhook endpoint'ine (/api/webhooks/stripe) sahte bir JSON payload gönderir.
Beklenen Sonuç: Endpoint, isteğin header'ındaki stripe-signature değerini stripe.webhooks.constructEvent fonksiyonu ile doğrulamalıdır. İmza geçersizse veya yoksa, sistem anında 400 Bad Request dönmeli ve sipariş durumunu KESİNLİKLE güncellememelidir.
Edge Case 3: Çift Tıklama (Double Submit) ile Mükerrer Sipariş
Müşteri, internet bağlantısının yavaş olduğu bir anda "Siparişi Tamamla" butonuna art arda 5 kez tıklar.
Beklenen Sonuç: Frontend butonu ilk tıklamada "disabled" (devre dışı) duruma getirmeli ve backend aynı sepet/session ID ile saniyeler içinde gelen mükerrer siparişleri reddetmelidir (Idempotency).
ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

Adım 1: AI Chat endpoint'ini (src/app/api/chat/route.ts vb.) kontrol et. Eğer bir Rate Limiting (Hız Sınırlandırması) yoksa, basit bir in-memory (veya Vercel KV/Upstash) rate limiter ekle.

Adım 2: __tests__/security-rate-limit.test.ts dosyasını oluştur. AI endpoint'ine veya sipariş action'ına bir döngü içinde 10 hızlı istek at ve ilk birkaç istekten sonrakilerin reddedildiğini (örn: 429 status code veya hata mesajı) expect ile doğrula.

Adım 3: Stripe Webhook endpoint'ini kontrol et. stripe.webhooks.constructEvent metodunun kullanıldığından ve STRIPE_WEBHOOK_SECRET çevre değişkeninin kontrol edildiğinden emin ol.

Adım 4: __tests__/security-stripe-webhook.test.ts dosyasını oluştur. Geçersiz bir imza (signature) ile webhook endpoint'ine istek atıldığında siparişin güncellenmediğini ve hata dönüldüğünü test et.

Adım 5: Frontend sipariş butonunun (Checkout Button) tıklandıktan sonra isSubmitting state'i ile devre dışı bırakıldığını (disabled) kontrol et.

Adım 6: Testleri çalıştır (npm run test).
KATI KURALLAR VE GÜVENLİK KISITLAMALARI
ÜRETİM (PRODUCTION) ORTAMI KONTROLÜ: src/lib/stripe.ts içindeki isNonProductionEnv mantığının canlı ortamda (Vercel Production) kesinlikle sk_live_ anahtarlarını gerektirdiğinden emin ol. Test anahtarlarıyla canlıya çıkılması felaketle sonuçlanır.
IDEMPOTENCY (TEKRARLANABİLİRLİK): Sipariş oluşturma fonksiyonları idempotent olmalıdır. Aynı istek yanlışlıkla iki kez gelirse, müşteriden iki kez para çekilmemeli veya stok iki kez düşülmemelidir.
GÜVENLİ BAŞARISIZLIK (FAIL SECURE): Rate limit veya Webhook doğrulaması sırasında herhangi bir beklenmedik hata oluşursa, sistem varsayılan olarak işlemi REDDETMELİDİR (Fail Closed).