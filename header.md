# BAĞLAM (CONTEXT)
Bu görev, `elysonsweets.de` projesinin ana navigasyon (Header) bileşeninin yeniden tasarlanması ve kodlanmasını kapsar. 

**SEO Uzmanının Önerisinin Analizi ve Yeni Mimari Karar:**
SEO uzmanı muhtemelen anahtar kelime yoğunluğunu artırmak için ("B2B Großhandel", "B2B Rechner") menüyü şişirmiş. Ancak B2B e-ticaret UX standartlarına göre bu tasarım **bilişsel yükü (cognitive overload) artırır** ve boş sayfalara yönlendirme yapmak dönüşüm oranını düşürür. 
*   "Startseite" linki gereksizdir (Logo bu işi yapar).
*   "B2B Großhandel" ayrı bir sayfa olmamalıdır; çünkü **sitenin tamamı zaten bir B2B toptan satış platformudur**. Bu anahtar kelime anasayfanın (Home) H1/Meta etiketlerinde çözülmelidir.
*   "B2B Rechner" çok spesifik bir araçtır, ana menüde kalabalık yapmak yerine "Ürünler" veya "Sepet" akışı içinde sunulmalıdır.

**Yeni ve Temiz Navigasyon Mimarisi:**
1. Logo (Anasayfaya gider)
2. Produkte (Katalog)
3. Rezepte & AI (Reçeteler ve Barista AI birleşimi)
4. Blog [NEU]
5. Über uns
6. Kontakt
7. Sağ Aksiyonlar: Arama İkonu | Dil Seçici | Kundenportal (CTA Butonu)

Çalışılacak Dosyalar:
- `src/components/layout/Header.tsx` (veya mevcut Header bileşeninin yolu)
- `src/components/layout/MobileMenu.tsx` (Gerekirse alt bileşen)
- `src/lib/i18n/navigation.ts` (Menü linklerinin çoklu dil veri yapısı - oluşturulacak/güncellenecek)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `next/link` ve `next/navigation` (Yönlendirmeler ve aktif link tespiti için)
- `lucide-react` (Arama, Hamburger menü, Dil ikonları için)
- `framer-motion` (Mobil menü ve dropdown animasyonları için)
- `tailwind.config.ts` içindeki mevcut renk paleti (`primary`, `secondary`, `accent`)

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Çoklu Dil Navigasyon Veri Yapısının Oluşturulması**
  - `src/lib/i18n/navigation.ts` (veya benzeri bir dosya) oluştur/güncelle.
  - Menü öğelerini statik olarak tanımla. "B2B Großhandel" ve "Startseite" öğelerini kaldır.
  - Örnek yapı: `[{ key: 'products', href: '/produkte', label: { de: 'Produkte', tr: 'Ürünler', en: 'Products', ar: 'منتجات' } }, ...]`

- [ ] **Adım 2: Header İskeletinin ve Scroll Efektinin Kurulması**
  - `Header.tsx` bileşenini `use client` olarak ayarla.
  - Sayfa scroll edildiğinde arka planın hafif şeffaf (backdrop-blur) ve gölgeli olmasını sağlayan bir state (`isScrolled`) ekle.
  - Tailwind sınıfları: `fixed top-0 w-full z-50 transition-all duration-300`. Arka plan rengi olarak `bg-primary` (Antrasit) kullan.

- [ ] **Adım 3: Masaüstü Navigasyonun (Desktop Nav) Kodlanması**
  - Logoyu en sola yerleştir.
  - Orta kısma `map` fonksiyonu ile navigasyon linklerini diz.
  - Linklerin varsayılan rengini `text-secondary` (Krem) yap.
  - Hover durumunda ve aktif sayfada rengi `text-accent` (Altın) olarak değiştir.
  - "Blog" linkinin yanına Tailwind ile küçük, dikkat çekici bir `[NEU]` (veya `[YENİ]`) badge'i ekle (Örn: `bg-accent text-primary text-[10px] px-1.5 py-0.5 rounded-sm`).

- [ ] **Adım 4: Sağ Aksiyon Alanının (Action Area) Kodlanması**
  - Arama İkonu (`Search` from `lucide-react`): Tıklanınca arama modalını açacak şekilde ayarla (şimdilik sadece UI).
  - Dil Seçici Dropdown: Mevcut dili gösteren ve hover/click ile diğer dilleri açan kompakt bir menü.
  - **Kundenportal / Partnerportal CTA Butonu:** Sitenin en belirgin butonu olmalı. 
    - Sınıflar: `bg-accent text-primary font-bold px-5 py-2 rounded-md hover:bg-opacity-90 transition-colors`.
    - Link: `/[locale]/login` veya `/[locale]/portal/dashboard` (Kullanıcı giriş yapmışsa).

- [ ] **Adım 5: Mobil Menü (Hamburger) Entegrasyonu**
  - Ekran boyutu `md` veya `lg` altına düştüğünde masaüstü menüyü gizle (`hidden lg:flex`).
  - Hamburger ikonunu (`Menu` from `lucide-react`) göster.
  - Tıklandığında ekranın sağından veya üstünden açılan, `framer-motion` ile animasyonlu bir mobil menü (Drawer) kodla.
  - Mobil menü içinde tüm linkleri, dil seçiciyi ve Portal butonunu dikey düzende yerleştir.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)

- **KESİNLİKLE YAPMA:** "B2B Großhandel" isimli boş veya anlamsız bir sayfaya link verme. Sitenin tamamı B2B'dir. SEO uzmanının önerdiği bu link UX açısından bir anti-pattern'dir.
- **KESİNLİKLE YAPMA:** "Startseite" (Anasayfa) linkini metin olarak menüye koyma. Modern web standartlarında Logo bu işlevi görür.
- **RENK KULLANIMI:** Sadece `tailwind.config.ts` dosyasında tanımlı olan `primary` (#2B2B2B), `secondary` (#FAF9F6) ve `accent` (#C69F6B) renklerini kullan. Hardcoded hex kodları yazma.
- **PERFORMANS:** Header bileşeni her sayfada render edileceği için içine ağır veri çekme (fetch) işlemleri koyma. Kullanıcı oturum durumu (Portal butonu için) global state'ten veya middleware'den gelen proplarla yönetilmelidir.
- **ERİŞİLEBİLİRLİK (a11y):** Tüm linklere `aria-label` ekle. Mobil menü açıldığında arka planın scroll olmasını engelle (`document.body.style.overflow = 'hidden'`).