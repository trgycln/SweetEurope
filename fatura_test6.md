# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Tüm yerel E2E (Uçtan Uca) ve Negatif test senaryoları (Sipariş, Fatura, Kargo, Stok, RBAC, Küsurat, Ödeme Yöntemleri) başarıyla tamamlanmıştır. Sistem yerel ve staging ortamlarında "Production-Ready" (Canlıya Çıkmaya Hazır) durumdadır. 

Bu yönerge, kurulan bu kusursuz test altyapısının **Sürekli Entegrasyon (CI/CD)** boru hattına (pipeline) bağlanması ve canlı ortam (Production) için salt okunur bir **Smoke Test (Duman Testi)** oluşturulması amacıyla hazırlanmıştır.

**Kapsanan Modüller:**
- **GitHub Actions:** `playwright.yml` dosyasının testleri Vercel deployment öncesi/sonrası otomatik koşacak şekilde doğrulanması.
- **Production Smoke Test:** Canlı veritabanını veya Stripe'ı kirletmeden, sitenin ayakta olduğunu, login sayfasının açıldığını ve kataloğun render edildiğini doğrulayan hafif bir sentetik izleme (Synthetic Monitoring) testi.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **Test Türü:** CI/CD Pipeline Doğrulaması ve Production Smoke Test.
- **Araç:** GitHub Actions & Playwright.
- **Güvenlik Stratejisi (Read-Only):** Smoke test KESİNLİKLE veritabanına yazma işlemi (Insert/Update), sipariş oluşturma veya sepet onayı YAPMAYACAKTIR. Sadece kritik sayfaların HTTP 200 döndüğünü ve UI elementlerinin görünür olduğunu doğrulayacaktır.

---

# TEST SENARYOLARI (TEST CASES)

### 1. Production Smoke Test (Canlı Ortam Sağlık Kontrolü)
- Sitenin ana sayfasına (`https://elysonsweets.de`) gidilir.
- Sayfanın HTTP 200 döndüğü ve çökmediği (Next.js hydration error olmadığı) doğrulanır.
- Katalog sayfasına (`/de/products` veya `/tr/portal/katalog`) gidilir, en az 1 ürün kartının ekranda render edildiği doğrulanır (Veritabanı bağlantısının koptuğunu anlamak için).
- Login sayfasına (`/de/login`) gidilir, formun render edildiği doğrulanır (Giriş YAPILMAZ).

### 2. CI/CD Pipeline Kontrolü
- `.github/workflows/playwright.yml` dosyasının, yazılan `order-fulfillment.spec.ts` ve `order-negative-cases.spec.ts` dosyalarını çalıştıracak şekilde doğru yapılandırıldığının teyit edilmesi.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Production Smoke Test Dosyasının Oluşturulması**
  - `tests/e2e/smoke-production.spec.ts` adında yeni bir dosya oluştur.
  - İçerisine sadece `page.goto()` ve `expect(page.locator(...)).toBeVisible()` içeren, hiçbir butona tıklayıp form doldurmayan salt okunur (read-only) testler yaz.
  - *Önemli:* Bu testin `baseURL` ayarını doğrudan `https://elysonsweets.de` olarak ayarla (veya test içinde tam URL kullan).

- [ ] **Adım 2: GitHub Actions Workflow Kontrolü (E2E)**
  - `.github/workflows/playwright.yml` dosyasını aç.
  - `env` değişkenleri altında `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` gibi testlerin ihtiyaç duyduğu değişkenlerin GitHub Secrets'tan (`${{ secrets.XXX }}`) çekildiğinden emin ol. Eksikse ekle.
  - Test komutunun `npm run test:e2e` veya `npx playwright test` olduğundan emin ol.

- [ ] **Adım 3: Synthetic Monitoring Workflow Kontrolü (Smoke Test)**
  - `.github/workflows/synthetic-monitoring.yml` dosyasını aç.
  - Bu workflow'un sadece `tests/e2e/smoke-production.spec.ts` dosyasını çalıştırdığından emin ol (E2E sipariş testlerini canlıda çalıştırmaması için komutu `npx playwright test tests/e2e/smoke-production.spec.ts` olarak güncelle).
  - Cron job ayarının (örn: `0 * * * *` - her saat başı) doğru olduğunu teyit et.

- [ ] **Adım 4: Yerel Smoke Test Doğrulaması**
  - Terminalde `npx playwright test tests/e2e/smoke-production.spec.ts` komutunu çalıştırarak testin canlı siteyi bozmadan sadece okuma yaparak başarıyla geçtiğini doğrula.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **CANLI ORTAM KORUMASI (CRITICAL):** `smoke-production.spec.ts` dosyası içine KESİNLİKLE `fill`, `click` (özellikle submit butonlarına) veya API mock işlemleri ekleme. Bu test gerçek müşterilerin kullandığı canlı siteye atılacaktır.
2. **GİZLİLİK:** GitHub Actions dosyalarında hiçbir API anahtarını veya şifreyi düz metin (plain text) olarak bırakma. Her zaman `${{ secrets.SECRET_NAME }}` formatını kullan.
3. **İZOLASYON:** Smoke test, diğer E2E testlerinden tamamen bağımsız çalışmalı ve `setup.ts` / `teardown.ts` gibi veritabanı tohumlama scriptlerini KULLANMAMALIDIR.