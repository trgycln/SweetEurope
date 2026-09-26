# BAĞLAM (CONTEXT)
Bu görev, `elysonsweets.de` projesinin SEO/GEO (Generative Engine Optimization) mimarisini güçlendirmek ve üç kritik modülün (Reçete Sihirbazı, Blog, Maliyet Hesap Aracı) kullanıcı deneyimini (UX) B2B standartlarına göre yeniden yapılandırmayı kapsar.

**Mevcut Sorunlar ve Mimari Kararlar:**
1. **"AI" Vurgusunun Kaldırılması:** B2B müşterilerinde güven sorunu yaratmaması için "Barista AI" veya "Reçete AI" isimlendirmeleri tamamen kaldırılarak "Reçete Sihirbazı" (Rezept-Assistent) olarak değiştirilecektir.
2. **Reçete Sihirbazının Görünürlüğü:** Sihirbaz şu an reçete listesinin içinde kaybolmaktadır. Bu araç sitenin en güçlü "Lead Magnet" (Müşteri çekme) aracıdır. Reçeteler sayfasının en üstüne (Hero Section) entegre edilerek ilk bakışta görünür (Above the fold) hale getirilmelidir.
3. **Maliyet Hesap Aracı (Margin Calculator) Entegrasyonu:** Araç şu an yetim (orphaned) sayfadır ve UI olarak site bütünlüğünden uzaktır. Ana menüyü (Header) şişirmemek adına bu araç; Footer'daki "B2B & Tools" SEO silosuna ve Müşteri Portalı (Dashboard) içine yerleştirilecektir. Ayrıca UI'ı `primary` (Antrasit) ve `accent` (Altın) renkleriyle modernize edilecektir.
4. **SEO/GEO Silo Navigasyonu:** Footer, yapay zeka botlarının (ChatGPT, Perplexity, Google AI Overviews) site otoritesini (Topical Authority) anlaması için 3 ana sütuna (Wissen, Tools, Unternehmen) bölünecektir.

**Çalışılacak Dosyalar:**
- `src/lib/i18n/navigation.ts` ve `src/lib/i18n/pages.ts`
- `src/components/layout/Header.tsx` ve `src/components/layout/Footer.tsx`
- `src/app/[locale]/recipes/page.tsx` (Reçeteler Ana Sayfası)
- `src/app/[locale]/tools/margin-calculator/page.tsx` (Hesap Aracı)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `next/link` (Tüm yönlendirmeler locale parametresi ile yapılmalı)
- `lucide-react` (İkonografi için: Calculator, Wand2, BookOpen)
- Tailwind CSS (Mevcut `primary`, `secondary`, `accent` paleti)

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: İsimlendirme ve i18n Veri Yapısının Güncellenmesi**
  - `src/lib/i18n/navigation.ts` dosyasını aç.
  - `recipes-ai` anahtarını `recipes` olarak değiştir. Etiketleri şu şekilde güncelle: `{ de: 'Rezept-Bibliothek', en: 'Recipe Library', tr: 'Reçete Kütüphanesi', ar: 'مكتبة الوصفات' }`. (AI kelimesini tamamen çıkar).
  - `src/lib/i18n/pages.ts` dosyasında `baristaAiT` objesinin adını `recipeWizardT` olarak değiştir ve içindeki tüm "AI" geçen metinleri "Assistent" veya "Sihirbaz" olarak güncelle.

- [ ] **Adım 2: Header ve Footer (SEO Silo) Entegrasyonu**
  - `Header.tsx`: Ana menü sıralamasını şu şekilde yap: `Produkte` | `Rezept-Bibliothek` | `Blog [NEU]` | `Über uns` | `Kontakt`. Hesap aracını buraya KOYMA.
  - `Footer.tsx`: Footer'ı 3'lü SEO Silo mimarisine çevir:
    - **Sütun 1 (Wissen & Inspiration):** Produkte, Rezept-Bibliothek, Rezept-Assistent (Sihirbaz linki: `/[locale]/barista-ai`), HORECA Blog.
    - **Sütun 2 (B2B & Tools):** B2B Kundenportal, Partner Portal, Gewinnmargen-Rechner (Hesap Aracı linki: `/[locale]/tools/margin-calculator`).
    - **Sütun 3 (Unternehmen):** Über uns, Kontakt, Impressum, Datenschutz.

- [ ] **Adım 3: Reçeteler Sayfası (Hero Section) Revizyonu**
  - `src/app/[locale]/recipes/page.tsx` dosyasını aç.
  - Sayfanın en üstündeki Hero Section'ı "Split Screen" (İkiye bölünmüş) veya "Featured Card" yapısına çevir.
  - **Sol/Üst Kısım:** Reçete Kütüphanesi başlığı ve açıklaması.
  - **Sağ/Alt Kısım (DİKKAT ÇEKİCİ):** Reçete Sihirbazı CTA'sı. Bu alanı `bg-primary` arka plan, `border border-accent` ve altın rengi bir buton (`bg-accent text-primary`) ile tasarla. İkon olarak `Wand2` (Sihirli Değnek) kullan. Kullanıcı sayfaya girer girmez "Kendi İmza Reçeteni Yarat" kutusunu devasa şekilde görmeli.

- [ ] **Adım 4: Maliyet Hesap Aracı (Margin Calculator) UI Modernizasyonu**
  - `src/app/[locale]/tools/margin-calculator/page.tsx` dosyasını aç.
  - Sayfa arka planını `bg-secondary` (Krem) yap.
  - Hesaplama kartının (Card) arka planını `bg-primary` (Antrasit), metinleri `text-secondary` yap.
  - Input alanlarını B2B form standartlarına getir: `bg-transparent border-b border-accent/50 focus:border-accent text-secondary outline-none`.
  - Sonuç gösterim alanını (Kâr Marjı, Satış Fiyatı) büyük, okunabilir ve `text-accent` (Altın) renginde vurgula.
  - Sayfanın en üstüne SEO uyumlu H1 başlığı ve kısa bir açıklama ekle (Örn: "B2B Gewinnmargen-Rechner für die Gastronomie").

- [ ] **Adım 5: Hesap Aracına Portal İçinden Erişim (Contextual Linking)**
  - `src/app/[locale]/portal/dashboard/page.tsx` (veya portalın ana bileşeni) dosyasını aç.
  - "Hızlı İşlemler" (Quick Actions) veya "Finans" bölümüne "Maliyet Hesap Aracı" (Gewinnmargen-Rechner) için bir buton/link ekle. İkon olarak `Calculator` kullan.

# KATI KURALLAR VE ANTİ-PATTERN'LER

- **YAPAY ZEKA KELİMESİ YASAK:** Müşteriye dönük hiçbir UI bileşeninde "AI", "Yapay Zeka", "Artificial Intelligence" kelimeleri kullanılmayacaktır. Sadece "Sihirbaz", "Assistent", "Wizard" kullanılacaktır.
- **HESAP ARACI HEADER'A EKLENMEYECEK:** B2B kullanıcılarının bilişsel yükünü artırmamak için hesap makinesi ana navigasyona konulmayacak; sadece Footer (SEO için) ve Portal (Kullanım için) üzerinden erişilebilir olacaktır.
- **RENK DİSİPLİNİ:** Hesap aracı ve Reçete Sihirbazı CTA'sı tasarlanırken kesinlikle `tailwind.config.ts` dışından hex kodu girilmeyecek. Sadece `primary`, `secondary` ve `accent` kullanılacaktır.
- **LOKALİZASYON:** Eklenen tüm yeni linkler (Footer ve Portal içindekiler dahil) kesinlikle `/${locale}/...` formatında olmalıdır. Hardcoded `/de/` yazmak yasaktır.