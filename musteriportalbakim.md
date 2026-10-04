# BAĞLAM (CONTEXT)
Bu görev, aktif olarak çalışan ve ciro üreten B2B Müşteri Portalı'nın (özellikle Katalog ve Siparişler sayfalarının) performans optimizasyonunu içermektedir. Sistemde DOM şişmesi, gereksiz re-render'lar (yeniden çizimler) ve ana thread'i bloke eden ağır istemci tarafı hesaplamaları tespit edilmiştir. 
**Hedef:** Hiçbir iş kuralını (fiyatlandırma, sepet mantığı, sipariş oluşturma) bozmadan, React optimizasyon teknikleri (Memoization, Debouncing, Lazy Rendering/Infinite Scroll) kullanarak sayfa akıcılığını (FPS) ve yanıt süresini maksimize etmektir.

# BAĞIMLILIKLAR (DEPENDENCIES)
- `use-debounce` (Zaten `package.json` içinde mevcut, arama optimizasyonu için kullanılacak).
- `react` ( `useMemo`, `useCallback`, `memo`, `useEffect`, `useState`, `useRef` hook'ları).
- Ekstra bir sanallaştırma (virtualization) kütüphanesi EKLENMEYECEKTİR. CSS Grid yapılarını bozmamak adına "Client-Side Lazy Rendering (Infinite Scroll)" yöntemi kullanılacaktır.

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Katalog Sayfası Arama Optimizasyonu (Debouncing)**
  - `src/app/[locale]/portal/katalog/KatalogClient.tsx` (veya ilgili Katalog Client bileşeni) dosyasını aç.
  - Kullanıcının arama kutusuna girdiği metni tutan state'i (örn. `searchTerm`) `use-debounce` kütüphanesindeki `useDebounce` hook'u ile sarmala (örn. `const [debouncedSearchTerm] = useDebounce(searchTerm, 300);`).
  - Ürün filtreleme mantığını (`filteredProducts`) `searchTerm` yerine KESİNLİKLE `debouncedSearchTerm` kullanarak çalıştır. Bu sayede her harf basımında 500 ürün baştan filtrelenmeyecek.

- [ ] **Adım 2: Katalog Sayfası DOM Optimizasyonu (Client-Side Lazy Rendering)**
  - `KatalogClient.tsx` içinde, filtrelenmiş ürünlerin tamamını tek seferde DOM'a basmak yerine bir `visibleCount` state'i oluştur (başlangıç değeri: 20).
  - Ürünleri listelerken `.slice(0, visibleCount)` kullan.
  - Listenin en sonuna görünmez bir `div` (ref ile) ekle ve `IntersectionObserver` kullanarak bu `div` ekrana girdikçe `visibleCount` değerini 20 artır. Bu sayede CSS Grid yapısı bozulmadan DOM şişmesi engellenecektir.

- [ ] **Adım 3: Ürün Kartı Re-render Optimizasyonu (React.memo)**
  - Katalog sayfasında listelenen her bir ürün kartı bileşenini (örn. `KatalogProductCard` veya `ProduktGridCard`) `React.memo` ile sarmala.
  - **Kritik Nokta:** `PortalContext`'ten gelen `warenkorb` (sepet) array'ini doğrudan karta prop olarak GEÇME. Bunun yerine, sadece o ürüne ait sepetteki miktarı (`cartQuantity`) hesaplayıp karta primitive (number) bir prop olarak geç.
  - Böylece sepete A ürünü eklendiğinde, B, C ve D ürünlerinin kartları gereksiz yere re-render olmayacaktır.

- [ ] **Adım 4: Fiyat Hesaplama Motorunun Hafızaya Alınması (useMemo)**
  - Ürün kartı bileşeni içinde `pricingUtils.ts`'den çağrılan `hesaplaBirimFiyat` veya `hesaplaSepetSatiri` fonksiyonlarını `useMemo` içine al.
  - Bağımlılık dizisine (dependency array) sadece `urun`, `secilenBirim`, `cartQuantity` ve `userRole` ekle. Bu sayede fiyatlar sadece miktar veya birim değiştiğinde yeniden hesaplanır, her render'da işlemci yorulmaz.

- [ ] **Adım 5: Siparişler Sayfası Optimizasyonu**
  - `src/app/[locale]/portal/siparisler/SiparislerClient.tsx` (veya ilgili bileşen) dosyasını aç.
  - Adım 1 ve Adım 2'deki mantığı (Debounced Search ve Lazy Rendering / Pagination) geçmiş siparişler listesi için de uygula.
  - Sipariş satırlarını/kartlarını `React.memo` ile sarmala. Genişletme/Daraltma (Accordion) state'lerini global değil, satırın kendi lokal state'inde veya optimize edilmiş bir ID listesi ile yönet.

# KATI KURALLAR VE ANTİ-PATTERN'LER
- **KESİNLİKLE YAPMA:** `PortalContext.tsx` içindeki `warenkorb` state yapısını veya `addToWarenkorb` fonksiyonlarının iş mantığını DEĞİŞTİRME. Sepet ve sipariş akışı kusursuz çalışmaktadır, sadece tüketen (consumer) bileşenleri optimize etmelisin.
- **KESİNLİKLE YAPMA:** `pricingUtils.ts` içindeki matematiksel formüllere veya KDV hesaplamalarına DOKUNMA.
- **KESİNLİKLE YAPMA:** CSS Grid veya Flexbox yapılarını bozacak, responsive tasarımı kıracak harici kütüphaneler (örn. `react-window` grid modülü) KULLANMA. Lazy rendering (slice + IntersectionObserver) en güvenli yoldur.
- **ZORUNLULUK:** `React.memo` kullanırken, bileşene geçilen fonksiyon proplarının (örn. `onAddToCart`) `useCallback` ile sarmalandığından emin ol. Aksi takdirde referans değişeceği için `memo` işe yaramaz.