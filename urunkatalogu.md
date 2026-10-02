# BAĞLAM (CONTEXT)
Bu görev, Elyson Sweets B2B Admin Paneli'ndeki "Katalog İndir (PDF)" işlevinin, `@react-pdf/renderer` kütüphanesi kullanılarak profesyonel, kompakt ve çok dilli (DE/EN) bir B2B ürün kataloğuna dönüştürülmesini kapsar.

**Mevcut Durum:** Admin panelinde ürün yönetimi sayfasında bir buton var ancak işlevsiz veya ilkel çalışıyor.
**Hedef:** 
1. Butonun bir Dropdown'a çevrilerek "Almanca İndir" ve "İngilizce İndir" seçenekleri sunması.
2. A4 Yatay (Landscape) formatında, sayfalarca uzamayan, kompakt bir tablo tasarımı yapılması.
3. Sadece `aktif = true` olan ürünlerin çekilmesi.
4. `stok_miktari <= 0` olan ürünlerin isminin yanına "(Vorbestellung)" veya "(Pre-order)" ibaresinin eklenmesi.
5. Fiyatların KESİNLİKLE "Adet Fiyatı" (Unit Price) olarak 3 kademede (1-4 Koli, 5+ Koli, Palet) gösterilmesi.

**Çalışılacak Dosyalar:**
- `src/app/actions/katalog-actions.ts` (Yeni - Veri çekme mantığı)
- `src/components/admin/urun-yonetimi/urunler/KatalogPdfDocument.tsx` (Yeni - React-PDF şablonu)
- `src/components/admin/urun-yonetimi/urunler/KatalogDownloadButton.tsx` (Yeni/Güncellenecek - UI Butonu)
- `src/app/[locale]/admin/urun-yonetimi/urunler/page.tsx` (veya ilgili Client bileşeni - Butonun entegrasyonu)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `@react-pdf/renderer` (Zaten `package.json` içinde mevcut. PDF üretimi için KESİNLİKLE bu kullanılacak, `html2canvas` veya `jspdf` KULLANILMAYACAK).
- `lucide-react` (Buton ikonları için).

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Veri Çekme İşlemi (Server Action)**
  - `src/app/actions/katalog-actions.ts` dosyasını oluştur.
  - `getKatalogData(locale: 'de' | 'en')` adında bir fonksiyon yaz.
  - Supabase'den `aktif = true` olan tüm ürünleri ve bağlı oldukları kategorileri (`kategoriler(id, ad, sira)`) çek.
  - Ürünleri kategoriye göre grupla. Kategorileri kendi içinde isme veya sıraya göre diz.
  - Dönen veriyi şu formata map'le: 
    `{ categoryName: string, products: [{ name, image, artNr, ean, weight, boxQty, palletQty, price1, price2, price3, inStock }] }`
  - İsimleri çekerken JSONB alanından ilgili dili (`ad[locale]`) al. Bulamazsa fallback yap.

- [ ] **Adım 2: PDF Şablonunun Oluşturulması (React-PDF)**
  - `src/components/admin/urun-yonetimi/urunler/KatalogPdfDocument.tsx` dosyasını oluştur.
  - `@react-pdf/renderer` kütüphanesinden `Document, Page, Text, View, StyleSheet, Image` import et.
  - `StyleSheet.create` ile kompakt bir tasarım yap:
    - `page`: `flexDirection: 'column', padding: 20, orientation: 'landscape', fontSize: 9`
    - `tableHeader`: Koyu gri arka plan, beyaz metin, bold.
    - `categoryRow`: Açık gri arka plan, bold metin (Kategorileri ayırmak için).
    - `tableRow`: Altı çizili (borderBottom), `paddingVertical: 4`.
    - `image`: `width: 30, height: 30, objectFit: 'contain'`.
  - **Kapak/Başlık Alanı:** En üste "Elyson Sweets B2B Preisliste & Produktkatalog" (veya İngilizcesi), sağ köşeye "Stand: [Güncel Tarih]" yaz.
  - **Tablo Sütunları:** 
    1. Bild (Görsel)
    2. Produkt & Details (İsim, Art-Nr, EAN. Eğer `inStock === false` ise ismin yanına kırmızı/turuncu renkte `(Vorbestellung)` veya `(Pre-order)` yaz).
    3. Logistik (Gewicht, VPE/Karton, Palette).
    4. 1-4 Kartons (Stückpreis) -> `satis_fiyati_musteri`
    5. 5+ Kartons (Stückpreis) -> `satis_fiyati_toptanci`
    6. Palette (Stückpreis) -> `satis_fiyati_alt_bayi` (veya `satis_fiyati_palet`)
  - *Not:* Fiyatları `€ X,XX` formatında yazdır.

- [ ] **Adım 3: İndirme Butonu ve Dropdown UI (Client Component)**
  - `src/components/admin/urun-yonetimi/urunler/KatalogDownloadButton.tsx` dosyasını oluştur.
  - `use client` direktifini ekle.
  - Bir Dropdown menü tasarla (Örn: "Katalog İndir" butonuna basılınca "🇩🇪 Deutsch (PDF)" ve "🇬🇧 English (PDF)" açılsın).
  - Kullanıcı bir dile tıkladığında:
    1. Buton "Hazırlanıyor..." (Loading) state'ine geçsin.
    2. `getKatalogData(secilenDil)` action'ını çağır.
    3. Veri gelince `@react-pdf/renderer`'ın `pdf()` fonksiyonunu kullanarak `KatalogPdfDocument` bileşenini render et ve Blob'a çevir.
    4. `URL.createObjectURL` ile blob'u indir (`elyson-sweets-katalog-de.pdf`).
    5. Loading state'ini kapat.

- [ ] **Adım 4: Butonun Admin Paneline Entegrasyonu**
  - Ürün yönetimi sayfasını (`src/app/[locale]/admin/urun-yonetimi/urunler/page.tsx` veya ilgili client bileşeni) aç.
  - Eski, işlevsiz "Katalog İndir (PDF)" butonunu bul ve sil.
  - Yerine yeni oluşturduğun `KatalogDownloadButton` bileşenini yerleştir.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)
- **PDF KÜTÜPHANESİ:** Kesinlikle `@react-pdf/renderer` kullanılacaktır. HTML'i Canvas'a çeviren (html2canvas vb.) hiçbir kütüphane kullanılmayacaktır.
- **RESİM YÜKLEME (CORS):** Supabase Storage'dan gelen resim URL'leri `@react-pdf/renderer` içinde bazen CORS hatası verebilir. Eğer resim yüklenemezse PDF'in çökmemesi için `<Image src={url} />` kullanımında dikkatli ol. Gerekirse resim URL'sine `?t=timestamp` ekleyerek cache'i kır veya hata durumunda boş bir View göster.
- **FİYAT GÖSTERİMİ:** Fiyatlar KESİNLİKLE adet (şişe/paket) fiyatı olmalıdır. Koli toplam fiyatı YAZILMAYACAKTIR.
- **SAYFA DÜZENİ:** Her kategori için yeni bir sayfa (Page Break) BAŞLATMA. Bu, sayfa sayısını gereksiz artırır. Kategorileri aynı tablo içinde, arka planı farklı bir satır (Row) ile ayır.
- **STOK KONTROLÜ:** `stok_miktari <= 0` olan ürünler listeye DAHİL EDİLECEK, ancak isimlerinin yanında mutlaka ön sipariş uyarısı yer alacaktır.