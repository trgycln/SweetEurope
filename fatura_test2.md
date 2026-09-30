# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Bu yönerge, `order-fulfillment.spec.ts` E2E testinin koşumu sırasında Adım 6'da karşılaşılan `profile_not_found_or_error` hatasının çözümü ve test akışının kesintisiz devam edebilmesi için hazırlanmıştır. 

**Sorun Analizi:** Supabase Auth servisinde kullanıcı başarıyla oluşturulmasına rağmen, `public.profiles` (veya `profiller`) tablosunda bu kullanıcıya ait bir kayıt ve geçerli bir `firma_id` bulunmamaktadır. RLS (Row Level Security) politikaları standart API anahtarlarıyla dışarıdan (test scripti üzerinden) bu tabloya veri yazılmasını engellemektedir.

---

# TEST STRATEJİSİ VE MİMARİ KARAR (STRATEGY)

**MİMARİ KARAR:** Kesinlikle Yerel (Local) Supabase Ortamına Geçiş Yapılacaktır.
Uzak (Remote/Staging) veritabanındaki RLS politikalarını testler geçsin diye esnetmek veya "bypass" kuralları eklemek, güvenlik zafiyeti yaratacağı için **kesinlikle reddedilmiştir.** 

**Çözüm Stratejisi:**
1. Testler için izole bir yerel Supabase ortamı (`supabase start`) ayağa kaldırılacaktır.
2. `setup.ts` dosyası, RLS politikalarını tamamen ezip geçebilen **Supabase Service Role Key** (Admin yetkisi) kullanılarak yeniden yapılandırılacaktır.
3. Test kullanıcısı oluşturulurken, Auth kaydı ile eşzamanlı olarak `profiles` ve `companies` (firma) tablolarına gerekli mock datalar Service Role Key ile enjekte edilecektir.

---

# TEST SENARYOLARI (TEST CASES) - GÜNCELLEME

### 1. Setup (Tohumlama) Doğrulama Senaryosu
- `setup.ts` çalıştırıldığında;
  - `auth.users` tablosunda `test_customer@example.com` oluşmalı.
  - `public.companies` (veya ilgili firma tablosu) tablosunda "Test Firması" adında bir kayıt oluşmalı.
  - `public.profiles` tablosunda, Auth UID'si ile eşleşen ve `firma_id`'si "Test Firması"na bağlı olan bir profil kaydı oluşmalı.

### 2. Login Akışı Doğrulama (Kaldığı Yerden Devam)
- Playwright, `test_customer@example.com` ile login olduğunda Next.js `login/page.tsx` profili başarıyla bulmalı.
- Kullanıcı `/tr/login?error=profile_not_found_or_error` sayfasına düşmek yerine, doğrudan `/tr/portal/` (Müşteri Portalı) ana sayfasına yönlendirilmelidir.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Yerel Supabase Ortamının Başlatılması**
  - Terminalde `npx supabase start` komutunu çalıştırarak yerel Supabase konteynerlerini ayağa kaldır.
  - Çıktı olarak verilen `API URL`, `anon key` ve en önemlisi `service_role key` değerlerini not al.

- [ ] **Adım 2: Test Ortam Değişkenlerinin (.env.test) Güncellenmesi**
  - Proje kök dizinindeki `.env.test` (veya Playwright'ın kullandığı env dosyası) dosyasını yerel Supabase bilgilerine göre güncelle:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<yerel_anon_key>
    SUPABASE_SERVICE_ROLE_KEY=<yerel_service_role_key>
    ```

- [ ] **Adım 3: Veritabanı Şemasının Yerel Ortama Aktarılması**
  - `npx supabase db push` veya `npx supabase migration up` komutları ile mevcut canlı/staging veritabanı şemasını (tablolar, RLS'ler, triggerlar) yerel Supabase'e uygula.

- [ ] **Adım 4: `setup.ts` Dosyasının Service Role Key ile Yeniden Yazılması**
  - `tests/e2e/setup.ts` dosyasını aç. Supabase client'ını `anon_key` yerine `SUPABASE_SERVICE_ROLE_KEY` ile başlatacak şekilde değiştir.
  - Tohumlama (Seed) mantığını şu sırayla güncelle:
    1. `supabase.auth.admin.createUser(...)` ile test kullanıcısını oluştur.
    2. `supabase.from('companies').insert(...)` ile mock bir firma oluştur ve ID'sini al.
    3. `supabase.from('profiles').insert({ id: user.id, firma_id: company.id, role: 'customer', ... })` ile profili oluştur. (RLS, Service Role Key kullanıldığı için bu işleme izin verecektir).

- [ ] **Adım 5: Next.js Login Mantığının Kontrolü (Gerekirse)**
  - `login/page.tsx` ve `portal/layout.tsx` dosyalarını incele. Profil sorgusunun hangi tabloya ve hangi sütunlara (örn: `firma_id`) baktığını teyit et. `setup.ts` içinde oluşturulan mock datanın bu beklentiyi birebir karşıladığından emin ol.

- [ ] **Adım 6: Testin Yeniden Koşulması**
  - `npx playwright test tests/e2e/order-fulfillment.spec.ts` komutunu çalıştır.
  - Login işleminin başarıyla geçip geçmediğini ve testin Adım 3 (Sepete ürün ekleme) aşamasına ilerleyip ilerlemediğini doğrula.

- [ ] **Adım 7: Kalan E2E Akışının Tamamlanması**
  - Login sorunu çözüldükten sonra, orijinal `fatura_test.md` dosyasındaki Adım 3, 4 ve 5'in (Sipariş, Fatura, Kargo, Müşteri Kontrolü) kesintisiz çalışmasını sağla. Hata veren yerleri onar.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **RLS POLİTİKALARINA DOKUNULMAYACAK:** Uzak (Remote) veritabanındaki hiçbir RLS politikası, trigger veya güvenlik kuralı testleri geçirmek amacıyla değiştirilmeyecektir.
2. **SERVICE ROLE KEY KULLANIMI:** `SUPABASE_SERVICE_ROLE_KEY` sadece ve sadece `setup.ts` (test tohumlama) ve `teardown.ts` (test temizleme) scriptlerinde kullanılmalıdır. Next.js uygulama kodunun (client veya standart API route'ları) içine kesinlikle sızdırılmamalıdır.
3. **İZOLASYON:** Testler çalışırken uygulamanın (`localhost:3000`) `.env.test` dosyasını okuduğundan ve uzak veritabanına değil, yerel Supabase'e (`127.0.0.1:54321`) bağlandığından %100 emin olun.