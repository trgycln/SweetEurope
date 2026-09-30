# BAĞLAM VE TEST KAPSAMI (CONTEXT)

Tüm QA, E2E test ve CI/CD süreçleri başarıyla tamamlanmış ve sistem %100 Production-Ready olarak canlıya alınmıştır. Bu aşamadan sonra projenin sürdürülebilirliği, performansı ve güvenliği için "Teknik Borç (Technical Debt) Temizliği ve Optimizasyon" fazına geçilmelidir.

Daha önce sağlanan `knip_report.txt` analizine göre projede kullanılmayan 433 dosya, 7 ana bağımlılık (dependency) ve 106 kullanılmayan dışa aktarım (export) bulunmaktadır. Bu yönerge, canlı sistemi riske atmadan bu ölü kodların (dead code) temizlenmesi ve projenin hafifletilmesi amacıyla hazırlanmıştır.

**Kapsanan Modüller:**
- **Bağımlılık Yönetimi (Dependencies):** Kullanılmayan NPM paketlerinin kaldırılması.
- **Dosya Sistemi:** `_archive`, `scripts` ve kullanılmayan eski test/UI dosyalarının temizlenmesi.
- **Regresyon Testi:** Temizlik sonrası sistemin bozulmadığının E2E testleri ve Build işlemi ile kanıtlanması.

---

# TEST STRATEJİSİ VE ARAÇLAR (STRATEGY)

- **Test Türü:** Regresyon (Regression) ve Build Testi.
- **Araç:** Knip (Statik Analiz), Next.js Build, Playwright.
- **Strateji:** Temizlik işlemleri atomik (parça parça) yapılacak. Her silme işleminden sonra `npm run build` alınarak Next.js'in dinamik importlar veya gizli bağımlılıklar nedeniyle çöküp çökmediği kontrol edilecek. En son aşamada Playwright E2E testleri koşularak iş mantığının korunduğu doğrulanacak.

---

# TEST SENARYOLARI (TEST CASES)

### 1. Bağımlılık (Dependency) Temizliği Doğrulaması
- Kullanılmayan paketler (`@google/genai`, `@react-three/drei`, `@stripe/stripe-js` [Eğer server-side stripe kullanılıyorsa client paketi gereksiz olabilir, dikkatli olunmalı], `chart.js`, `jspdf-autotable`, `pdf-parse`, `react-chartjs-2`) kaldırılır.
- *Beklenti:* `npm run build` hatasız tamamlanmalı ve paket boyutu (bundle size) küçülmelidir.

### 2. Ölü Kod ve Dosya (Dead Code) Temizliği Doğrulaması
- `knip_report.txt` içinde listelenen `_archive/` klasörü ve kullanılmayan `scripts/` dosyaları silinir.
- *Beklenti:* Proje dizini temizlenmeli, derleme süresi kısalmalı ve E2E testleri (`npx playwright test`) eksiksiz geçmelidir.

---

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Kullanılmayan Bağımlılıkların Kaldırılması**
  - Terminalde şu komutu çalıştır: `npm uninstall @google/genai @react-three/drei chart.js jspdf-autotable pdf-parse react-chartjs-2`
  - *(Not: `@stripe/stripe-js` paketi client tarafında Apple Pay/Google Pay için kullanılıyorsa kaldırma, Knip bazen dinamik importları kaçırabilir. Emin değilsen bırak).*
  - DevDependencies temizliği: `npm uninstall -D @types/uuid eslint-config-next ts-node`

- [ ] **Adım 2: Arşiv ve Çöp Dosyaların Silinmesi**
  - Proje kök dizinindeki `_archive/` klasörünü tamamen sil.
  - `knip_report.txt` dosyasında listelenen ve artık kullanılmayan eski scriptleri (`scripts/` altındaki tek kullanımlık migration/update scriptleri) sil veya ayrı bir yedek repository'sine taşı.

- [ ] **Adım 3: Build ve Tip Kontrolü (Type Check)**
  - Terminalde `npm run build` komutunu çalıştır.
  - Eğer silinen bir dosya veya paket başka bir yerde kullanılıyorsa TypeScript hata verecektir. Hata veren yerleri tespit et ve o importları da temizle.

- [ ] **Adım 4: Regresyon Testlerinin Koşulması**
  - Build başarıyla tamamlandıktan sonra, yerel sunucuyu başlat (`npm run start`).
  - Yeni bir terminalde `npx playwright test` komutunu çalıştırarak tüm E2E testlerinin (Sipariş, RBAC, Stok, Küsurat) hala yeşil (Passed) olduğunu doğrula.

- [ ] **Adım 5: Temizliğin Commit Edilmesi**
  - Tüm testler geçtikten sonra yapılan temizliği Git'e kaydet: `git add .` ve `git commit -m "chore: Remove unused dependencies and dead code based on knip report"`.
  - Değişiklikleri `main` branch'ine pushla.

---

# KATI KURALLAR VE GÜVENLİK KISITLAMALARI

1. **DİNAMİK İMPORT RİSKİ:** Knip gibi statik analiz araçları, `next/dynamic` veya string interpolation ile çağrılan dosyaları "kullanılmıyor" sanabilir. Bir dosyayı silmeden önce projede global bir arama (Search in Files) yaparak gerçekten kullanılmadığından emin ol.
2. **ADIM ADIM İLERLEME:** Tüm dosyaları ve paketleri aynı anda silme. Önce paketleri sil ve build al. Sonra `_archive` klasörünü sil ve build al. Hata çıkarsa geri almayı (revert) kolaylaştırmak için atomik çalış.
3. **CANLI ORTAM KORUMASI:** Bu temizlik işlemleri KESİNLİKLE doğrudan canlı ortamda (Production) yapılmamalıdır. Yerelde test edilip, GitHub Actions üzerinden CI/CD pipeline'ından geçtikten sonra Vercel'e deploy edilmelidir.