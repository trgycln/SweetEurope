# 🗺️ Ziyaret Planlama Sistemi Kullanım Kılavuzu

## Özellikler

### 1. 📍 Müşteri Seçim ve Sepet Sistemi
Müşteri Yönetimi sayfasında (`/tr/admin/crm/firmalar`) artık her firmanın yanında bir checkbox bulunmaktadır. Bu checkbox'lar ile:
- ✅ Ziyaret etmek istediğiniz firmaları işaretleyebilirsiniz
- 📝 Seçimler tarayıcınızda otomatik olarak kaydedilir (sayfa yenilense bile kaybolmaz)
- 🎯 Aynı anda birden fazla firma seçebilirsiniz

### 2. 🗂️ Ziyaret Planlayıcı Panel
Firmaları seçmeye başladığınızda sağ alt köşede bir panel açılır:
- **Seçili Firmalar Listesi**: Tüm seçili firmaların adres bilgileriyle birlikte görüntülenir
- **Sıralı Görünüm**: Firmalar seçim sıranıza göre numaralandırılır
- **Kolay Çıkarma**: Her firmayı tek tıkla listeden çıkarabilirsiniz
- **Toplu Temizleme**: Tüm listeyi bir anda temizleyebilirsiniz

### 3. 🚗 Google Maps Güzergah Oluşturma
**"Konumumdan Başla"** butonuna bastığınızda:
- Tarayıcınız konum izni isteyecek - **izin verin**
- Mevcut konumunuz otomatik olarak başlangıç noktası olarak ayarlanır
- Seçili firmaların Google Maps linklerinden konum bilgileri otomatik olarak çıkarılır
- Google Maps Directions API kullanılarak optimum güzergah oluşturulur
- Tüm seçili firmalar ara duraklar (waypoints) olarak eklenir
- Yeni bir sekmede Google Maps açılır ve rotanız hazır olur

**İki Seçenek:**
1. **Konumumdan Başla** (Önerilen): Bulunduğunuz yerden başlayan rota
   - Konum izni vermeniz gerekir
   - En optimize rota için ideal
   
2. **İlk Firmadan Başla**: Konum izni vermek istemiyorsanız
   - İlk seçili firma başlangıç noktası olur
   - Geri kalan firmalar ara durak ve varış noktası olur

**Konum İzni:**
- İlk kullanımda tarayıcı konum izni isteyecek
- "İzin Ver" / "Allow" seçeneğine tıklayın
- İzin verdikten sonra artık her seferinde otomatik çalışır
- Konum izni vermezseniz "İlk firmadan başla" seçeneğini kullanın

**Desteklenen Google Maps URL Formatları:**
- Koordinat tabanlı linkler: `?q=lat,lng`
- Place ID tabanlı linkler: `place_id=...`
- Standart place linkler: `/place/.../@lat,lng`
- Adres tabanlı (fallback)

### 4. 📊 Gelişmiş Filtreleme Sistemi
Firmaları coğrafi yakınlığa göre filtreleyebilirsiniz:

#### 🏙️ Şehir Filtresi
- Tüm şehirler normalleştirilmiş şekilde listelenir
- Örnek: Köln, Bonn, Bergisch Gladbach, vb.

#### 📮 PLZ (Posta Kodu) Filtresi  
- **ÇOK ÖNEMLİ**: Birbirine yakın bölgeleri bulmak için en etkili filtre!
- PLZ'ler ilçe bilgisiyle birlikte gösterilir
- Örnek: `50667 - Innenstadt`, `50823 - Ehrenfeld`
- Aynı PLZ grubundaki firmalar genellikle birbirine çok yakındır

#### 🗺️ İlçe Filtresi
- İlçelere göre filtreleme
- Örnek: Innenstadt, Ehrenfeld, Mülheim, vb.

---

## 🚀 Kullanım Adımları

### Adım 1: Bölge Seçimi
1. `/tr/admin/crm/firmalar` sayfasına gidin
2. **PLZ filtresini** kullanarak yakın bölgeleri seçin
   - Örnek: `50667`, `50668`, `50670` gibi ardışık PLZ'ler yakın bölgelerdir
   - Veya **Şehir** filtresini kullanın: `Köln`
   - Veya **İlçe** filtresini kullanın: `Ehrenfeld`

### Adım 2: Firma Seçimi
1. Listedeki firmaların yanındaki **checkbox'ları** işaretleyin
2. Sağ alt köşede **Ziyaret Planlayıcı** paneli açılacak
3. Panel'de seçili firmaları gözden geçirin
4. Gerekirse bazı firmaları listeden çıkarın (X butonuna basarak)

### Adım 3: Güzergah Oluşturma
1. En az 1 (tercihen 2+) firma seçili olmalı
2. Seçili firmalarda **Google Maps linki** olmalı
3. **"Konumumdan Başla"** butonuna basın
4. Tarayıcı konum izni isteyecek - **İzin Ver** seçeneğine tıklayın
5. Google Maps otomatik olarak açılır ve rotanız hazır!
6. Alternatif: Konum izni vermek istemezseniz **"İlk firmadan başla"** butonunu kullanın

### Adım 4: Sahada Kullanım
- Telefonunuzdan veya tabletten ziyaret listesine erişebilirsiniz
- Konum izni verdiyseniz, bulunduğunuz yerden başlayan rota görürsünüz
- Google Maps uygulaması güzergahı adım adım yönlendirme ile gösterir
- Her firmada işinizi bitirdikten sonra sonraki durağa devam edin
- Rota, seçim sıranıza göre optimize edilir

---

## 🛠️ Veri Kalitesi ve Normalizasyon

### Sorun: Tutarsız Şehir/İlçe Verileri
Bazı firmalarda şehir adı farklı yazılmış olabilir:
- "Köln", "koln", "cologne", "Köln-Mülheim" gibi varyantlar

### Çözüm: Normalizasyon Script'i

Veri kalitesini artırmak için aşağıdaki script'leri çalıştırın:

```bash
# 1. Önce analiz yapın (sadece rapor üretir)
npm run location:analyze

# 2. Dry-run ile ne değişeceğini görün
npm run location:normalize

# 3. Değişiklikleri uygulayın (dikkatli olun!)
npm run location:normalize:apply
```

**Normalizasyon Script'i Ne Yapar?**
- ✅ PLZ'ye göre şehir ve ilçe bilgilerini düzeltir
- ✅ Şehir isimlerini standart hale getirir (Köln varyantları → "Köln")
- ✅ Köln'e bağlı mahalleri "Köln" şehrine atar
- ⚠️ Google Maps linki olan ama PLZ'si olmayan firmaları raporlar

**PLZ Haritası:**
Script, 50'den fazla Köln ve civarı PLZ'yi tanır:
- Köln İç Şehir: 50667-50679
- Köln Dış Mahalleler: 50733-50999, 51061-51149
- Çevre Şehirler: Bergisch Gladbach, Bonn, Brühl, Hürth, vb.

---

## 💡 İpuçları ve En İyi Uygulamalar

### 🎯 Verimli Ziyaret Planlaması
1. **Coğrafi Gruplaştırma**: Aynı PLZ veya ilçedeki tüm potansiyel müşterileri seçin
2. **Öncelik Sıralaması**: A ve B öncelikli müşterileri filtreleyerek başlayın
3. **Saha Kaynağı**: "Saha" kaynağından gelen firmaları önceliklendirin
4. **Google Maps Kontrolü**: Listedeki 🗺️ ikonunu kontrol edin - link yoksa manuel ekleyin
5. **Konum İzni**: İlk kullanımda konum izni verin - bu sayede her zaman konumunuzdan başlayan rota alırsınız
6. **Sıralı Seçim**: Gitmek istediğiniz sıraya göre firmaları seçin (varsayılan olarak seçim sıranız korunur)

### 🚫 Kaçınılması Gerekenler
- ❌ Çok uzak (farklı şehir) firmaları aynı güzergaha eklemeyin
- ❌ 10'dan fazla firma seçmeyin (Google Maps limiti ve günlük kapasite)
- ❌ Google Maps linki olmayan firmalara güvenmeyin

### 📱 Mobil Kullanım
- Ziyaret Planlayıcı mobil uyumludur
- Telefonunuzda listeyi görüp Google Maps'te açabilirsiniz
- Checkbox'lar mobil görünümde de çalışır

---

## 🔧 Teknik Detaylar

### Bileşenler
- **VisitPlannerContext** (`src/contexts/VisitPlannerContext.tsx`): State management
- **VisitPlannerPanel** (`src/components/VisitPlannerPanel.tsx`): Floating panel UI
- **FirmaRow** (`src/app/[locale]/admin/crm/firmalar/FirmaRow.tsx`): Checkbox'lı firma satırı

### Veri Akışı
1. Kullanıcı checkbox'ı işaretler
2. Context'e firma bilgileri eklenir
3. LocalStorage'da otomatik kaydedilir
4. Panel güncellenir
5. "Güzergah Oluştur" → Google Maps URL'si oluşturulur
6. Yeni sekmede açılır

### Google Maps URL Formatı
```
https://www.google.com/maps/dir/?api=1
  &origin=MEVCUT_KONUMUNUZ (lat,lng)
  &destination=SON_FIRMA_KONUMU
  &waypoints=FIRMA1|FIRMA2|FIRMA3
  &travelmode=driving
```

**Başlangıç Noktası:**
- **Varsayılan**: Tarayıcı Geolocation API ile mevcut konumunuz
- **Alternatif**: İlk seçili firma (konum izni yoksa)

---

## 📞 Destek

Herhangi bir sorun veya öneriniz varsa:
- GitHub Issues açabilirsiniz
- Veya doğrudan geliştirici ile iletişime geçin

---

## 🎉 Sonuç

Artık sahada etkili ziyaret planlaması yapabilir, coğrafi olarak yakın müşterileri gruplayabilir ve Google Maps ile optimal güzergahlar oluşturabilirsiniz. İyi ziyaretler! 🚗✨
