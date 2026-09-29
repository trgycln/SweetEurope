- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-public-endpoints-anti-spam.md`

Hedef Modül: Halka Açık Uç Noktalar (Public Endpoints), Anti-Spam Koruması ve Hız Sınırlandırması (Rate Limiting).
Kapsam: İç sistem (B2B mantığı, finans, yetkilendirme) tamamen kurşun geçirmez hale getirildi. Bu **FİNAL GÜVENLİK AŞAMASI**, sistemin dış duvarlarının (Outer Walls) savunmasını kapsar. Kimlik doğrulaması gerektirmeyen (Unauthenticated) halka açık formların (İletişim Formu, Waitlist/Ön Kayıt, Numune Talebi) otomatik botlar (Spam/DDoS) tarafından sömürülmesini engellemek.
İlişkili Kritik Dosyalar:
- `src/app/api/iletisim/route.ts` (veya iletişim formu action'ı)
- `src/app/api/waitlist/route.ts` (veya waitlist kayıt action'ı)
- `src/app/api/sample-request/route.ts` (veya numune talebi action'ı)
- `src/middleware.ts` (Global Rate Limiting için)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Rate Limiting Testing (Vitest): Aynı IP adresinden veya aynı session üzerinden kısa süre içinde (örn: 1 dakikada 5'ten fazla) gelen isteklerin `429 Too Many Requests` ile reddedildiğinin test edilmesi.
2. Honeypot / Bot Protection Testing (Playwright): Formlara eklenen gizli (hidden) alanları dolduran otomatik botların (Honeypot tuzağına düşenlerin) veritabanına kayıt atamadan engellendiğinin UI/E2E seviyesinde doğrulanması.

- TEST SENARYOLARI (TEST CASES)

* Negative Path 1: Waitlist / İletişim Formu Spam Saldırısı (Rate Limit)
1. Kötü niyetli bir bot, `Waitlist` (Ön Kayıt) API uç noktasına saniyede 10 istek atacak şekilde bir script çalıştırır.
2. Beklenen Sonuç: Sistem ilk 3-5 isteği (belirlenen limite göre) kabul etmeli, ancak limiti aşan ardışık istekleri veritabanına (Supabase) KESİNLİKLE yazmamalı ve e-posta (Resend) tetiklememelidir. API anında `429 Too Many Requests` hatası dönmelidir.

* Negative Path 2: Honeypot Tuzağı (Bot Tespiti)
1. İletişim formuna CSS ile gizlenmiş (`display: none` veya `opacity: 0`) sahte bir input alanı (örn: `name="fax_number"`) eklenir.
2. Gerçek bir insan bu alanı göremeyeceği için boş bırakır. Ancak DOM'u tarayan bir bot bu alanı doldurur.
3. Beklenen Sonuç: Sunucu (Server Action), `fax_number` alanının dolu olduğunu tespit ettiği an isteği sessizce reddetmeli (HTTP 200 dönüp başarılıymış gibi davranabilir ancak DB'ye kayıt atmamalıdır).

* Happy Path: Gerçek Kullanıcı Deneyimi
1. Gerçek bir ziyaretçi siteye girer, iletişim formunu veya numune talebini normal bir hızda doldurur.
2. Beklenen Sonuç: İşlem başarıyla gerçekleşir, veritabanına kayıt atılır ve adminlere bildirim gider.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: Halka açık formların Server Action veya API Route dosyalarını bul (İletişim, Waitlist, Numune Talebi).
- [ ] Adım 2: Bu dosyalara basit bir "Rate Limiting" mantığı ekle. (Eğer projede Redis/Upstash yoksa, IP bazlı basit bir in-memory Map veya Supabase Edge Functions limitleri kullanılabilir. Next.js 15 kullanılıyorsa `middleware.ts` üzerinden IP bazlı kısıtlama eklenebilir).
- [ ] Adım 3: Frontend form bileşenlerine (Contact Form, Waitlist Form) bir "Honeypot" alanı ekle. (Örn: `<input type="text" name="bot_field" className="hidden" tabIndex={-1} autoComplete="off" />`).
- [ ] Adım 4: Server Action içinde bu Honeypot alanını kontrol et: `if (formData.get('bot_field')) return { success: true };` (Botu kandırmak için success dön ama DB'ye yazma).
- [ ] Adım 5: `__tests__/security-anti-spam.test.ts` dosyasını oluştur. API'ye bir döngü içinde 10 istek at ve 429 hatasının fırlatıldığını `expect` ile doğrula. Ayrıca Honeypot alanı dolu gönderilen bir isteğin veritabanı mock'unu tetiklemediğini test et.
- [ ] Adım 6: Testleri çalıştır (`npm run test`).

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. VERİTABANI ŞİŞMESİ (DB BLOAT) KORUMASI: Halka açık uç noktalar, Supabase veritabanını çöp verilerle doldurmaya en müsait yerlerdir. Rate limit kontrolü, Supabase `insert` komutundan ÖNCE yapılmalıdır.
2. MALİYET KORUMASI: Spam istekler sadece veritabanını doldurmakla kalmaz, aynı zamanda Resend (E-posta) ve AI (Gemini) API kotalarını tüketerek şirkete maddi zarar verir. Anti-spam duvarı en dış katmanda (Edge/Middleware veya Action'ın ilk satırında) olmalıdır.
3. KULLANICI DENEYİMİ (UX): Gerçek kullanıcıları rahatsız edecek zorlu CAPTCHA'lar (trafik lambası seçme vb.) yerine, görünmez Honeypot ve arka plan Rate Limiting tercih edilmelidir. B2B müşterileri hızlı işlem yapmak ister.