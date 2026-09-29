- BAĞLAM VE TEST KAPSAMI (CONTEXT)
Dosya Adı: `test-plan-portal-authorization-flow.md`

Hedef Modül: Müşteri Portalı Erişim İzni, E-posta Gönderimi ve Oturum Açma Süreci (Portal Authorization & Onboarding Flow).
Kapsam: Admin panelindeki CRM listesinden bir firmanın portal erişiminin aktif edilmesi, Supabase Auth üzerinde kullanıcının yaratılması, Resend üzerinden geçici şifre ile e-posta gönderilmesi ve müşterinin bu bilgilerle portala sorunsuz giriş yapabilmesi.
Kritik Sorun (Pain Point): Mevcut sistemde e-posta gönderimi (Resend API) başarısız olduğunda (API çökmesi, geçersiz e-posta vb.), sistem hatayı yutmakta (silent failure) ve işlemi başarılı kabul etmektedir. Bu durum, müşteriye şifre gitmemesine rağmen sistemde "Portal Aktif" görünmesine ve sürecin tıkanmasına yol açmaktadır. Bu modül "Kurşun Geçirmez" (Bulletproof) ve "Atomik" (Ya hep ya hiç) bir yapıya kavuşturulacaktır.
İlişkili Kritik Dosyalar:
- `src/lib/email.ts` (E-posta gönderim mantığı - Hata yutma sorununun kaynağı)
- `src/app/actions/firma-actions.ts` veya ilgili yetkilendirme action dosyası (Auth yaratma ve Rollback mantığı)
- `src/middleware.ts` (Giriş sonrası yönlendirme)

- TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)
1. Transactional Rollback Testing (Vitest): E-posta gönderiminin başarısız olduğu durumlarda, Supabase üzerinde açılan Auth hesabının ve Profil kaydının anında silinerek (Rollback) sistemin eski temiz haline döndüğünün test edilmesi.
2. Error Handling & Resilience (Vitest): `email.ts` içindeki `sendPortalWelcomeEmail` fonksiyonunun hataları yutmak yerine fırlatacak (throw) şekilde refactor edilmesi ve bu fırlatılan hatanın UI'a doğru yansıdığının testi.
3. Full E2E Onboarding Flow (Playwright): Adminin portal izni vermesi -> E-postanın (mock) gitmesi -> Müşterinin login olması -> Dashboard'u görmesi akışının uçtan uca simülasyonu.

- TEST SENARYOLARI (TEST CASES)

* Negative Path 1: Resend API Çökmesi (Silent Failure Koruması)
1. Admin, bir firma için "Portal Erişimini Aktif Et" butonuna tıklar.
2. Sistem Supabase Auth'ta kullanıcıyı yaratır.
3. Sistem Resend API'ye e-posta isteği atar, ancak Resend 500 hatası döner veya API key geçersizdir.
4. Beklenen Sonuç: Sistem bu hatayı YUTMAMALIDIR. Hata anında yakalanmalı, Supabase Auth'ta az önce yaratılan kullanıcı `admin.deleteUser()` ile SİLİNMELİDİR (Rollback). Admin paneline "İşlem başarısız: E-posta gönderilemediği için portal izni iptal edildi" şeklinde net bir hata dönmelidir. Firma durumu "Portal Aktif" OLMAMALIDIR.

* Negative Path 2: Geçersiz E-posta Adresi
1. Admin, e-posta adresi eksik veya formatı bozuk (`test@.com`) olan bir firma için portal izni vermeye çalışır.
2. Beklenen Sonuç: Sistem Supabase Auth'a istek atmadan ÖNCE e-posta validasyonu yapmalı ve işlemi "Geçersiz e-posta adresi" hatasıyla anında reddetmelidir.

* Happy Path: Kusursuz Yetkilendirme ve Giriş (The Golden Onboarding)
1. Admin geçerli bir firma için portal izni verir.
2. Supabase Auth kullanıcısı yaratılır, profil `Müşteri` rolüyle güncellenir.
3. Resend API başarıyla e-postayı gönderir (HTTP 200).
4. Müşteri, e-postadaki geçici şifre ve e-posta adresiyle `/de/login` sayfasına girer.
5. Beklenen Sonuç: Middleware, rolü `Müşteri` olarak tespit edip kullanıcıyı `/de/portal/dashboard` sayfasına yönlendirmelidir. Kullanıcı admin paneline KESİNLİKLE erişememelidir.

- ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] Adım 1: `src/lib/email.ts` dosyasını aç. `sendPortalWelcomeEmail` ve diğer e-posta fonksiyonlarındaki `try/catch` bloklarını incele. Eğer `error` varsa sadece `console.error` yapıp geçiyorsa, bunu `throw new Error(error.message)` şeklinde değiştir. E-posta gitmezse kodun akışı KESİNLİKLE durmalıdır.
- [ ] Adım 2: Portal izni veren Server Action fonksiyonunu (örn: `src/app/actions/firma-actions.ts` içindeki `activatePortalAccess` vb.) bul.
- [ ] Adım 3: Bu Server Action içine "Kompansasyon (Rollback)" mantığını yaz:
      ```typescript
      // Örnek Mantık:
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({...});
      try {
         await sendPortalWelcomeEmail({...});
      } catch (emailError) {
         // E-posta gitmediyse, açılan hesabı SİL!
         await supabase.auth.admin.deleteUser(authUser.user.id);
         return { success: false, error: "E-posta gönderilemedi, işlem iptal edildi." };
      }
      ```
- [ ] Adım 4: `__tests__/portal-authorization.test.ts` dosyasını oluştur. `sendPortalWelcomeEmail` fonksiyonunu `vi.mock` ile hata fırlatacak şekilde ayarla. Server action'ı çağırdığında Supabase `deleteUser` metodunun tetiklendiğini (Rollback yapıldığını) `expect` ile doğrula.
- [ ] Adım 5: `tests/e2e/portal-onboarding.spec.ts` dosyasını oluştur. Playwright ile Admin girişi yap, bir test firmasına portal izni ver (e-posta servisini mockla), ardından çıkış yapıp o test firmasının bilgileriyle login ol ve `/portal/dashboard` sayfasına başarıyla ulaşıldığını doğrula.
- [ ] Adım 6: Testleri çalıştır (`npm run test` ve `npm run test:e2e`). Hata yutma (silent failure) sorununun tamamen çözüldüğünden emin ol.

- KATI KURALLAR VE GÜVENLİK KISITLAMALARI
1. SESSİZ HATA (SILENT FAILURE) KESİNLİKLE YASAKTIR: 3. parti bir servis (Resend) başarısız olduğunda, veritabanı "başarılı" gibi güncellenemez. Sistem "Ya Hep Ya Hiç" (Atomicity) prensibiyle çalışmak zorundadır.
2. ŞİFRE GÜVENLİĞİ: Geçici şifreler veritabanında düz metin (plain text) olarak ASLA saklanmamalıdır. Şifre sadece anlık olarak üretilip Supabase Auth'a verilmeli ve e-posta şablonuna basılmalıdır.
3. ROL İZOLASYONU: Müşteri portalına giriş yapan kullanıcının token'ı, `middleware.ts` tarafından sıkı bir şekilde denetlenmeli, `/admin` rotalarına erişim kesinlikle 403/Redirect ile engellenmelidir.