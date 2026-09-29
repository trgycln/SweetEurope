# BAĞLAM (CONTEXT)
Kullanıcı talebi: Sitenin PWA (Progressive Web App) mobil uygulamaya dönüştürülmesi. Ancak "bozulma veya hata riski varsa yapılmaması" şartı koşulmuştur.

**Baş Mimarın Risk Analizi ve Kararı:**
Elyson Sweets sıradan bir blog değil; canlı stok takibi, karmaşık B2B fiyatlandırma kuralları, Supabase Auth oturum yönetimi ve ERP entegrasyonları içeren dinamik bir sistemdir. 
Geleneksel "Offline-First" (Çevrimdışı öncelikli) tam bir PWA kurulumu, Service Worker'ların API yanıtlarını ve veritabanı sorgularını agresif şekilde önbelleklemesine (caching) neden olur. Bu durum;
1. Müşterilerin eski (stale) stok verilerini görmesine,
2. Sepet ve fiyatlandırma hesaplamalarında senkronizasyon hatalarına,
3. Supabase Auth token'larının Service Worker ile çakışarak oturum düşmelerine yol açma **riski taşır.**

**Uygulanacak Güvenli Mimari (Safe PWA / Installable Web App):**
Sistemi riske atmamak adına agresif önbellekleme yapan bir PWA **YAPILMAYACAKTIR**. Bunun yerine, sadece mobil cihazlara yüklenebilmeyi (Add to Home Screen) sağlayan, iOS ve Android'de native uygulama gibi görünen ancak veri akışında her zaman ağı (Network-First/Network-Only) kullanan **"Güvenli PWA (Lite PWA)"** mimarisi kurulacaktır. Bu sayede sıfır bozulma riski ile mobil uygulama deneyimi elde edilecektir.

Çalışılacak Dosyalar:
- `package.json`
- `next.config.ts`
- `src/app/manifest.ts` (Yeni)
- `src/app/sw.ts` (Yeni - Service Worker)
- `src/app/layout.tsx`

# BAĞIMLILIKLAR (DEPENDENCIES)
- `@serwist/next` ve `serwist` (Next.js 14/15 App Router için en güncel, güvenli ve aktif bakımı yapılan PWA kütüphanesidir. Eski ve hatalı `next-pwa` KESİNLİKLE KULLANILMAYACAKTIR).

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Serwist Paketlerinin Kurulumu**
  - Terminalde şu komutu çalıştırarak güvenli PWA bağımlılıklarını projeye ekle:
    `npm install @serwist/next serwist`

- [ ] **Adım 2: Next.js Konfigürasyonunun (next.config.ts) Güncellenmesi**
  - `next.config.ts` dosyasını aç.
  - `@serwist/next` kütüphanesinden `withSerwistInit` fonksiyonunu import et.
  - Serwist konfigürasyonunu oluştur: `swSrc: 'src/app/sw.ts'`, `swDest: 'public/sw.js'`, `disable: process.env.NODE_ENV === 'development'` (Geliştirme ortamında SW çalışmasın ki debug zorlaşmasın).
  - Mevcut `nextConfig` objesini `withSerwist(nextConfig)` ile sarmalayarak export et.

- [ ] **Adım 3: Güvenli Service Worker (sw.ts) Oluşturulması**
  - `src/app/sw.ts` dosyasını oluştur.
  - `serwist` paketinden gerekli modülleri import et.
  - **Kritik Güvenlik Ayarı:** Sadece statik dosyaları (resimler, fontlar, CSS/JS chunk'ları) önbelleğe al. 
  - `/api/.*` ve `.*\.supabase\.co/.*` rotaları için KESİNLİKLE `NetworkOnly` stratejisini uygula. Bu, ERP ve Auth verilerinin asla önbellekte bayatlamamasını (stale data) garanti eder.

- [ ] **Adım 4: App Manifest (manifest.ts) Oluşturulması**
  - Next.js App Router standartlarına uygun olarak `src/app/manifest.ts` dosyasını oluştur.
  - İçerisinde şu bilgileri dönen bir fonksiyon yaz:
    - `name`: "Elyson Sweets B2B"
    - `short_name`: "Elyson Sweets"
    - `description`: "B2B Großhandel für Premium-Sirupe und Dessert-Zutaten"
    - `start_url`: "/"
    - `display`: "standalone" (Tarayıcı çubuklarını gizler, native app hissi verir)
    - `background_color`: "#FAF9F6" (Mevcut `secondary` rengi)
    - `theme_color`: "#2B2B2B" (Mevcut `primary` rengi)
    - `icons`: `public` klasöründe var olduğu varsayılan (veya eklenecek) `icon-192x192.png` ve `icon-512x512.png` tanımlamaları.

- [ ] **Adım 5: Layout.tsx Meta Etiketlerinin Güncellenmesi**
  - `src/app/layout.tsx` dosyasını aç.
  - Next.js `Metadata` ve `Viewport` objelerini güncelle.
  - `Viewport` objesine `themeColor: '#2B2B2B'` ekle.
  - `Metadata` objesine iOS desteği için `appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Elyson Sweets' }` ekle.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **KESİNLİKLE YAPMA:** `next-pwa` paketini kullanma. Bu paket terk edilmiştir ve Next.js App Router ile uyumsuzdur. Sadece `@serwist/next` kullanılacaktır.
- **KESİNLİKLE YAPMA:** Service Worker içinde `CacheFirst` veya `StaleWhileRevalidate` stratejilerini API (`/api/*`) veya Supabase (`*.supabase.co`) istekleri için KULLANMA. Bu durum B2B siparişlerinde yanlış fiyat veya stok gösterimine yol açar. Bu rotalar her zaman `NetworkOnly` olmalıdır.
- **GÜVENLİK:** PWA sadece `production` build'inde aktif olmalıdır. `next.config.ts` içinde `disable: process.env.NODE_ENV === 'development'` kuralı kesinlikle yer almalıdır.
- **BÜTÜNLÜK:** Manifest dosyasındaki renkler, `tailwind.config.ts` içindeki marka renkleriyle (`primary: #2B2B2B`, `secondary: #FAF9F6`) birebir eşleşmelidir.