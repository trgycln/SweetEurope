- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-api-csrf-security.md`

Hedef Modül: Admin API Uç Noktaları (API Routes) ve CSRF (Cross-Site Request Forgery) Koruması.
Kapsam: Müşteri portalı yetkilendirme, rollback, oturum düşürme ve anti-spam aşamaları kusursuz tamamlandı. Ancak loglardan anlaşıldığı üzere bu kritik işlemler Next.js Server Actions yerine doğrudan API Route'ları (`/api/admin/create-personel-user/route.ts`, `/api/admin/update-firma-status/route.ts`) üzerinden yapılıyor. Next.js Server Actions varsayılan olarak CSRF korumasına sahipken, **API Route'ları CSRF saldırılarına karşı savunmasızdır**. Kötü niyetli bir site, oturumu açık olan bir Admin'i kandırarak arka planda bu API'lere istek attırabilir ve yetkisiz portal erişimi dağıtabilir veya silebilir. Bu son aşama, API uç noktalarına katı bir "Origin/Referer" (Kaynak) doğrulaması eklenmesini kapsar.
İlişkili Kritik Dosyalar:
- `src/app/api/admin/create-personel-user/route.ts`
- `src/app/api/admin/update-firma-status/route.ts`
- `src/middleware.ts` veya yeni oluşturulacak `src/lib/security-utils.ts`

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. CSRF Vulnerability Testing (Vitest): API uç noktalarına dış bir kaynaktan (farklı bir domainden) geliyormuş gibi sahte `Origin` ve `Referer` header'ları ile istek atılarak sistemin bu istekleri `403 Forbidden` ile reddettiğinin test edilmesi.
2. Security Middleware/Utility Entegrasyonu: Tüm `/api/admin/*` rotalarında çalışacak, isteğin sadece `elysonsweets.de` (veya localhost) üzerinden geldiğini doğrulayan merkezi bir güvenlik kalkanı oluşturulması.

- TEST SENARYOLARI (TEST CASES)

* Negative Path 1: CSRF Saldırısı (Farklı Origin)
1. Saldırgan, kendi sitesine (`https://malicious-site.com`) gizli bir form yerleştirir ve oturumu açık olan bir Admin'in bu siteyi ziyaret etmesini sağlar.
2. Tarayıcı, Admin'in Supabase çerezleriyle birlikte `/api/admin/create-personel-user` adresine bir POST isteği atar. İsteğin `Origin` header'ı `https://malicious-site.com` olarak görünür.
3. Beklenen Sonuç: API, isteği işleme almadan ÖNCE `Origin` header'ını kontrol etmeli, izin verilen domainler listesinde (whitelist) olmadığını tespit edip anında `403 Forbidden` (Geçersiz Kaynak) hatası dönmelidir. Veritabanında hiçbir işlem yapılmamalıdır.

* Negative Path 2: Eksik Origin/Referer Header'ı
1. Bir bot veya script, tarayıcı dışı bir ortamdan (Postman/cURL) `Origin` veya `Referer` header'ı olmadan API'ye istek atar.
2. Beklenen Sonuç: Güvenlik politikası gereği (Strict CORS/CSRF), kaynağı belirsiz olan state-changing (POST/PUT/DELETE) istekleri reddedilmelidir (`403 Forbidden`).

* Happy Path: Güvenli İç İstek
1. Admin, `https://elysonsweets.de/admin/crm` sayfası üzerinden yetki verme butonuna tıklar.
2. İstek `Origin: https://elysonsweets.de` header'ı ile gelir.
3. Beklenen Sonuç: Sistem kaynağı doğrular, Supabase Auth token'ını onaylar ve işlemi başarıyla gerçekleştirir.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)
- [ ] Adım 1: `src/lib/security-utils.ts` adında yeni bir dosya oluştur. İçerisine `verifyCsrfOrigin(request: NextRequest)` adında bir fonksiyon yaz. Bu fonksiyon isteğin `Origin` veya `Referer` header'ını alıp, `process.env.NEXT_PUBLIC_SITE_URL` (veya localhost) ile eşleşip eşleşmediğini kontrol etsin.
- [ ] Adım 2: `src/app/api/admin/create-personel-user/route.ts` ve `src/app/api/admin/update-firma-status/route.ts` dosyalarını aç. POST metodunun en üstüne `verifyCsrfOrigin` kontrolünü ekle. Eşleşme yoksa `return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })` döndür.
- [ ] Adım 3: `__tests__/security-csrf.test.ts` dosyasını oluştur. NextRequest objesini mock'layarak `Origin: https://evil.com` olan bir istek yarat ve API'nin (veya utility fonksiyonunun) bu isteği reddettiğini `expect` ile doğrula.
- [ ] Adım 4: Aynı test dosyasında `Origin: http://localhost:3000` (veya canlı URL) olan bir isteğin güvenlik kontrolünden başarıyla geçtiğini test et.
- [ ] Adım 5: Testleri çalıştır (`npm run test`).

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. CSRF KORUMASI ZORUNLULUĞU: Çerez (Cookie) tabanlı kimlik doğrulama kullanan tüm sistemlerde (Supabase SSR dahil), state değiştiren (POST/PUT/DELETE) API Route'ları CSRF saldırılarına açıktır. Bu kontrol atlanamaz.
2. LOCALHOST TOLERANSI: Geliştirme ortamının bozulmaması için `verifyCsrfOrigin` fonksiyonu `NODE_ENV === 'development'` durumunda `localhost` veya `127.0.0.1` kaynaklarına izin vermelidir.
3. GÜVENLİ BAŞARISIZLIK (FAIL CLOSED): Eğer `Origin` ve `Referer` header'larının ikisi de yoksa (bazı katı gizlilik eklentileri silebilir), B2B admin paneli gibi yüksek güvenlikli bir sistemde güvenlikten taviz verilmemeli ve istek reddedilmelidir.