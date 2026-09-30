# BAĞLAM (CONTEXT)
Arka planda Lexware fatura entegrasyonu, Storno işlemleri ve Kargo takip altyapısı başarıyla kuruldu. Admin paneli ve e-posta bildirimleri sorunsuz çalışıyor. TypeScript hataları sıfırlandı.
Bu görevin amacı: Arka planda kurulan bu altyapının **Müşteri Portalı (Customer Portal)** tarafındaki arayüzünü (UI) tamamlamaktır. Müşteriler kendi panellerine girdiklerinde faturalarını indirebilmeli ve kargolarını takip edebilmelidir.

Çalışılacak Dosyalar:
- `src/components/portal/siparisler/SiparisDetayClient.tsx` (veya müşteri portalındaki sipariş detaylarını gösteren ilgili bileşen)

# BAĞIMLILIKLAR (DEPENDENCIES)
- `lucide-react` (İndirme, Kamyon, Dosya ikonları için)

# ADIM ADIM İŞ AKIŞI (IMPLEMENTATION STEPS)

- [ ] **Adım 1: Müşteri Sipariş Detay Bileşeninin Tespiti**
  - Müşteri portalında sipariş detaylarının gösterildiği bileşeni (`SiparisDetayClient.tsx` veya benzeri) aç.
  - Sipariş verisi içinde `lexware_pdf_url`, `lexware_storno_pdf_url`, `kargo_firmasi`, `kargo_takip_no`, `kargo_takip_url`, `fatura_durumu` alanlarının çekildiğinden (Supabase select sorgusunda olduğundan) emin ol. Eksikse sorguya ekle.

- [ ] **Adım 2: Kargo Takip UI Entegrasyonu**
  - Sipariş durumu "Yola Çıktı" (Shipped) veya "Teslim Edildi" (Delivered) ise, sipariş özetinin üst kısmına şık bir "Kargo Bilgileri" kartı ekle.
  - İçerisinde Kargo Firması ve Takip Numarasını göster.
  - Eğer `kargo_takip_url` doluysa, yanına `lucide-react`'ten `Truck` veya `ExternalLink` ikonu içeren, yeni sekmede açılan (`target="_blank"`) bir **"Kargomu Takip Et"** butonu ekle.

- [ ] **Adım 3: Fatura (Rechnung) İndirme UI Entegrasyonu**
  - Siparişin `fatura_durumu` 'kesildi' ise ve `lexware_pdf_url` doluysa, sipariş detaylarına bir **"Faturayı İndir (PDF)"** butonu ekle.
  - Buton tıklandığında `window.open(siparis.lexware_pdf_url, '_blank')` ile faturayı tarayıcıda açsın/indirsin. İkon olarak `FileText` veya `Download` kullan.

- [ ] **Adım 4: İptal Faturası (Storno) İndirme UI Entegrasyonu**
  - Sipariş iptal edilmişse ve `lexware_storno_pdf_url` doluysa, kırmızı veya gri tonlarında bir **"İptal Faturasını İndir (Storno)"** butonu ekle.
  - Tıklandığında ilgili URL'yi yeni sekmede açsın.

- [ ] **Adım 5: UI/UX Cilasının Yapılması**
  - Eklenen butonların Tailwind CSS sınıflarını projenin genel tasarım diline (`primary`, `accent`, `secondary` renkleri) uygun hale getir.
  - Butonların mobil cihazlarda (responsive) düzgün göründüğünden emin ol.

# KATI KURALLAR VE ANTİ-PATTERN'LER (STRICT RULES & ANTI-PATTERNS)
- **GÜVENLİK:** Müşteri sadece KENDİ siparişinin faturasını indirebilmelidir. (Bu zaten RLS ile korunuyor ancak UI tarafında da linklerin doğru siparişe ait olduğundan emin ol).
- **NULL KONTROLLERİ:** `lexware_pdf_url` veya `kargo_takip_url` null ise butonlar KESİNLİKLE render edilmemeli veya `disabled` state'inde, açıklayıcı bir tooltip ile gösterilmelidir. Uygulamanın `undefined` hatası verip çökmesine izin verme.
- **DİL DESTEĞİ:** Buton metinlerini (Faturayı İndir, Kargomu Takip Et) projenin çoklu dil yapısına uygun olarak (veya şimdilik Almanca/Türkçe fallback ile) yaz.