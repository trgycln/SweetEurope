- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-production-deployment.md`

Hedef Modül: Canlıya Alma (Deployment), Ortam Değişkenleri (Environment Variables) Doğrulaması ve Gözlemlenebilirlik (Observability).
Kapsam: Tüm test fazları (Güvenlik, Finans, DSGVO, Resilience, Golden Flow) %100 başarıyla tamamlandı. Bu **NİHAİ AŞAMA (Faz 9 - Go-Live)**, kodun Vercel/Supabase üretim (Production) ortamına aktarılmasını, canlı veritabanı migrasyonlarının doğrulanmasını, cron job'ların aktif edilmesini ve "Smoke Test" (Duman Testi) ile canlı sistemin ayakta olduğunun kanıtlanmasını kapsar.
İlişkili Kritik Dosyalar:
- `vercel.json` (Cron job tanımları)
- `next.config.ts` (Build ayarları)
- `.env.production` (Canlı ortam değişkenleri - Vercel Dashboard)
- `supabase/migrations/*` (Canlı veritabanı şeması)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Pre-flight Build Testing (Next.js): Canlıya çıkmadan önce lokalde `npm run build` alınarak TypeScript veya ESLint kaynaklı son dakika derleme hatalarının (Build Failures) tespiti.
2. Environment Validation (Vercel/Supabase): Canlı ortamda test anahtarlarının (sk_test) unutulmadığının ve gerçek anahtarların (sk_live) devrede olduğunun statik analizi.
3. Production Smoke Testing (Playwright): Sistem canlı URL'ye (https://elysonsweets.de) deploy edildikten sonra, veritabanını kirletmeden sadece anasayfa, login ekranı ve katalog sayfalarının HTTP 200 döndüğünü doğrulayan hafif bir test.

- TEST SENARYOLARI (TEST CASES)

* Edge Case 1: Build ve Type-Check Bütünlüğü
1. CI/CD pipeline veya lokal terminal üzerinden `npm run build` komutu çalıştırılır.
2. Beklenen Sonuç: Next.js derleme süreci, hiçbir "Type Error" veya "ESLint Error" fırlatmadan başarıyla tamamlanmalı ve `.next` klasörü oluşturulmalıdır. (Not: `next.config.ts` içinde `ignoreBuildErrors: true` varsa bile, kritik hataların loglanıp loglanmadığı kontrol edilmelidir).

* Edge Case 2: Canlı Ortam Değişkenleri (Env Vars) Sızıntı Kontrolü
1. Vercel Production ortamındaki değişkenler kontrol edilir.
2. Beklenen Sonuç: `STRIPE_SECRET_KEY` kesinlikle `sk_live_` ile başlamalıdır. `NEXT_PUBLIC_SUPABASE_URL` canlı projeyi işaret etmelidir. `RESEND_API_KEY` ve `LEXWARE_API_KEY` üretim (production) yetkilerine sahip olmalıdır. Test ortamına ait hiçbir URL veya Key canlıda olmamalıdır.

* Edge Case 3: Vercel Cron Jobs Aktivasyonu
1. `vercel.json` dosyasındaki cron tanımları (Google Business Profile senkronizasyonu, otomatik blog vb.) Vercel platformuna deploy edilir.
2. Beklenen Sonuç: Vercel Dashboard -> Settings -> Cron Jobs sekmesinde ilgili görevlerin aktif olduğu ve zamanlamalarının (örn: `0 9 * * 1`) doğru parse edildiği doğrulanmalıdır.

* Happy Path 4: Production Smoke Test (Canlı Duman Testi)
1. Proje Vercel'e deploy edildikten sonra, Playwright ile canlı URL'ye (https://elysonsweets.de) salt okunur (read-only) bir test koşulur.
2. Beklenen Sonuç: Anasayfa, `/de/products` ve `/de/login` sayfaları 5 saniye içinde HTTP 200 dönmeli, konsolda kritik bir JavaScript hatası (Hydration error vb.) olmamalıdır.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: Terminalde `npm run build` komutunu çalıştır ve derleme sürecinin hatasız tamamlandığını doğrula.
- [ ] Adım 2: Supabase CLI kullanarak tüm lokal migration dosyalarının canlı veritabanına başarıyla uygulandığından emin ol (`supabase db push`).
- [ ] Adım 3: `tests/e2e/smoke-production.spec.ts` dosyasını oluştur. Bu test sadece canlı URL'ye gidip sayfaların çökmeksizin açıldığını (HTTP 200) ve ana elementlerin (Header, Footer) render edildiğini kontrol etsin. (Veritabanına kayıt atan hiçbir işlem YAPMASIN).
- [ ] Adım 4: Kodu Vercel'e pushla (Deploy). Vercel Dashboard üzerinden Environment Variables kısmını son kez gözden geçir.
- [ ] Adım 5: Deploy bittikten sonra lokal terminalinden `npx playwright test tests/e2e/smoke-production.spec.ts --project=chromium` komutunu çalıştırarak canlı siteyi doğrula.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. CANLI VERİTABANINI KİRLETME YASAĞI: Smoke testler KESİNLİKLE sipariş oluşturmamalı, kullanıcı kaydetmemeli veya Lexware/Stripe API'lerini tetiklememelidir. Sadece "Read-Only" (Salt Okunur) sayfa ziyaretleri yapılmalıdır.
2. SIFIR KESİNTİ (ZERO DOWNTIME): Veritabanı migration'ları uygulanırken mevcut tabloları `DROP` eden veya verileri silen yıkıcı (destructive) komutların canlıda çalışmadığından emin ol. Tüm migration'lar `IF NOT EXISTS` veya `ADD COLUMN` şeklinde güvenli olmalıdır.
3. GÖZLEMLENEBİLİRLİK (OBSERVABILITY): Canlıya çıkıldıktan sonra Vercel Analytics ve Supabase Logs ekranları açık tutulmalı, ilk 1 saat boyunca olası 500 hataları anlık olarak izlenmelidir.