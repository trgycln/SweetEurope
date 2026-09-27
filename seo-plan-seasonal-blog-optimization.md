# BAĞLAM (CONTEXT)
Bu görev, `elysonsweets.de` projesinin otomatik blog oluşturma (AI Blog Generation) altyapısını, Google'ın "Helpful Content" ve GEO (Generative Engine Optimization) algoritmalarına tam uyumlu hale getirmek için yeniden yapılandırılmasını kapsar.

**SEO Uzmanının Stratejik Kararları ve Düzeltmeler:**
1. **Mevsimsel ve Trend Odaklı İçerik (Seasonal Topical Authority):** Google Discover ve AI Overviews, zamanlaması doğru olan (timely) içerikleri öne çıkarır. Kışın ortasında "teras kokteylleri" yazmak SEO açısından intihardır. AI'a mevcut ay ve mevsim bilgisi dinamik olarak verilecek; içerikler yaklaşan trendlere (örn: Kasım ayında "Kış Menüsü ve Zencefilli Latte", Mayıs ayında "Soğuk Demleme ve Frappe") göre otomatik belirlenecektir.
2. **Marka Kimliği Düzeltmeleri:** Şirket adı kesinlikle bitişik olarak **"Elysonsweets"** yazılacaktır. Şurup markası için "Premium" ön eki zorunlu tutulmayacak, hem standart hem premium serileri kapsayacak şekilde sadece **"FO Şurupları"** (FO Sirupe / FO Syrups) terimi kullanılacaktır.
3. **Görsel Havuzunun Mevsime Göre Ayrılması:** Rastgele görsel seçimi yerine; görseller "Sıcak İçecekler/Kış", "Soğuk İçecekler/Yaz" ve "Genel B2B/Depo" olarak kategorize edilecek ve mevsime uygun görsel çekilecektir.

**Etkilenecek Dosyalar:**
- `src/lib/ai/prompts/topic-generator.ts` (Yeni - Mevsimsel konu belirleyici)
- `src/lib/ai/prompts/blog-prompt.ts` (Güncellenecek - Master Barista Persona)
- `src/lib/blog-images.ts` (Yeni - Kategorize edilmiş görsel havuzu)
- `src/app/api/cron/auto-blog/route.ts` (Cron job API'si)

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Mevsimsel Görsel Havuzunun Oluşturulması**
  - `src/lib/blog-images.ts` dosyasını oluştur.
  - Görselleri kategorilere ayır: `WINTER_IMAGES` (Sıcak çikolata, latte art, tarçınlı içecekler), `SUMMER_IMAGES` (Frappe, buzlu kokteyller, soğuk demleme), `GENERAL_B2B_IMAGES` (Barista çalışırken, depo, toptan kutular).
  - `getSeasonalBlogImage(month: number)` adında bir fonksiyon yaz. Ay bilgisine göre (Örn: 11, 12, 1, 2 -> Kış; 5, 6, 7, 8 -> Yaz) ilgili havuzdan rastgele yüksek çözünürlüklü bir görsel URL'si dönsün.

- [ ] **Adım 2: Dinamik ve Mevsimsel Konu Üretici (Topic Generator) Yazılması**
  - `src/lib/ai/prompts/topic-generator.ts` dosyasını oluştur.
  - `generateSeasonalTopic()` adında bir fonksiyon yaz. Bu fonksiyon sistemin o anki tarihini (`new Date().getMonth()`) alarak AI'a şu promptu göndersin:
    *"Şu anki ay: [Mevcut Ay]. Avrupa'daki kafeler, restoranlar ve oteller (HoReCa) için bu mevsime ve yaklaşan trendlere en uygun, B2B kârlılık odaklı 1 adet blog konusu belirle. Sadece konunun başlığını dön."*

- [ ] **Adım 3: Master Barista & HoReCa Uzmanı Prompt'unun Revize Edilmesi**
  - `src/lib/ai/prompts/blog-prompt.ts` dosyasını oluştur/güncelle.
  - `buildBlogGenerationPrompt(topic: string, currentMonth: string)` fonksiyonunu yaz.
  - **Prompt İçeriği (Çok Sıkı Kurallar):**
    - "Sen Avrupa'nın en saygın Master Barista'sı, Miksoloji Uzmanı ve B2B HoReCa Danışmanısın."
    - "Şu anki mevsim/ay: {currentMonth}. İçeriği bu mevsime uygun tüketim alışkanlıklarına göre şekillendir."
    - "Şirket adını KESİNLİKLE bitişik olarak **Elysonsweets** şeklinde yaz."
    - "Ürünlerden bahsederken KESİNLİKLE **FO Şurupları** (FO Sirupe / FO Syrups) terimini kullan."
    - "Rakiplerin (Monin, 1883 Routin, DaVinci, Giffard vb.) isimlerini KESİNLİKLE KULLANMA."
    - "Jenerik yapay zeka girişleri kullanma. Doğrudan teknik bilgiye, kârlılığa (Gewinnmarge), reçete maliyetlerine ve müşteri memnuniyetine odaklan."
    - "Çıktıyı KESİNLİKLE JSON formatında ver: `{ slug, title: {de, en, tr, ar}, excerpt: {de, en, tr, ar}, content: {de, en, tr, ar}, meta_title: {de, en, tr, ar}, meta_description: {de, en, tr, ar} }`"

- [ ] **Adım 4: Cron Job (Auto-Blog) API'sinin İki Aşamalı Hale Getirilmesi**
  - `src/app/api/cron/auto-blog/route.ts` dosyasını aç.
  - İş akışını şu şekilde güncelle:
    1. `generateSeasonalTopic()` fonksiyonunu çağırarak mevsime uygun trend konuyu al.
    2. Bu konuyu `buildBlogGenerationPrompt` içine vererek asıl makaleyi (JSON) ürettir.
    3. `getSeasonalBlogImage(currentMonth)` fonksiyonunu çağırarak mevsime uygun görseli al ve AI'ın JSON'ına `image_url` olarak ekle (AI'ın görsel uydurmasını engelle).
    4. Supabase `blog_yazilari` tablosuna kaydet.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **MARKA YAZIMI:** "Elyson Sweets" (ayrı) yazımı kesinlikle yasaktır. Sadece "Elysonsweets" kullanılacaktır.
- **ÜRÜN YAZIMI:** "Premium FO Şurupları" zorunluluğu yoktur. Sadece "FO Şurupları" (FO Sirupe) kullanılacaktır.
- **MEVSİMSEL TUTARLILIK:** Kış aylarında soğuk içecek, yaz aylarında sıcak içecek makalesi üretilmesi GEO (Generative Engine Optimization) açısından spam sinyali yaratır. Tarih/Ay context'i AI'a kesinlikle geçilmelidir.
- **GÖRSEL HALÜSİNASYONU YASAKTIR:** AI'ın `image_url` üretmesine kesinlikle izin verilmeyecek. Görseller her zaman `src/lib/blog-images.ts` içindeki mevsime duyarlı havuzdan seçilecek.
- **RAKİP İSİMLERİ YASAKTIR:** Prompt içine "DO NOT mention competitors like Monin, 1883 Routin, DaVinci, Giffard" kuralı büyük harflerle eklenecek.