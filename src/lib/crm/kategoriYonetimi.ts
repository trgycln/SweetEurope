/**
 * KÖLN DİSTRİBÜTÖR MASTER LİSTESİ
 * Kategori ve Puanlama Yönetimi
 * 
 * Ana Kategoriler: A (80-100), B (60-79), C (40-59), D (1-39)
 * Sıralama Mantığı: En Yüksek Ciro → En Sık Sipariş → Niş → Perakende
 */

// Ana kategori tipleri
export type AnaKategoriTip = "A" | "B" | "C" | "D";

// Eski sistem compatibility
export type FirmaKategoriTip = AnaKategoriTip;

/**
 * ANA KATEGORİLER ve AÇIKLAMALAR
 */
export const ANA_KATEGORILER: Record<AnaKategoriTip, string> = {
  "A": "🔥 HACİM KRALLARI (Ana Kategori A)",
  "B": "💰 GÜNLÜK NAKİT AKIŞI (Ana Kategori B)",
  "C": "⭐ NİŞ PAZARLAR (Ana Kategori C)",
  "D": "📦 PERAKENDE & RAF ÜRÜNLERİ (Ana Kategori D)"
};

/**
 * ALT KATEGORİLER (Hedef Müşteri Kitleri)
 * A: HACİM KRALLARI (En Yüksek Ciro)
 * Hedef: Tek faturada palet bazlı satış
 * Ürün: %90 Donuk Pasta (Düğün/Davet), %10 Paketli Ürün
 */
export const ALT_KATEGORILER_A = [
  "Düğün Salonları",
  "Catering Firmaları",
  "Büyük Oteller",
  "Şirket Kantinleri",
  "Fabrika Kantinleri"
];

/**
 * ALT KATEGORİLER
 * B: GÜNLÜK NAKİT AKIŞI (Sirkülasyon)
 * Hedef: Her hafta düzenli sipariş almak
 * Ürün: Donuk Pasta (Vitrin) + Kavanoz Kurabiye/Muffin (Kahve yanı)
 */
export const ALT_KATEGORILER_B = [
  "Kafeler",
  "Specialty Coffee",
  "Pastaneler",
  "AVM Kafeleri",
  "İstasyon Kafeleri"
];

/**
 * ALT KATEGORİLER
 * C: NİŞ PAZARLAR (Sadık Müşteriler)
 * Hedef: Operasyonu kolay, sadık müşteri kitlesi
 * Ürün: Donuk Pasta (Tatlı krizine yönelik)
 */
export const ALT_KATEGORILER_C = [
  "Shisha Bar & Lounge",
  "Burger & Steakhouse",
  "Dünya Mutfağı Restoranları",
  "Oyun Parkları & Müzeler",
  "Kokteyl Barları"
];

/**
 * ALT KATEGORİLER
 * D: PERAKENDE & RAF ÜRÜNLERİ (Al-Götür)
 * Hedef: Donuk olmayan, paketli ürünler
 * Ürün: %100 Raf Ürünü (Uzun ömürlü)
 */
export const ALT_KATEGORILER_D = [
  "Türk & Etnik Marketler",
  "Kiosklar & Büfeler",
  "Benzin İstasyonları",
  "Okul Kantinleri"
];

/**
 * ALT KATEGORİLER (Tümü birleştirilmiş - Lookup Tablosu)
 */
export const ALT_KATEGORILER: Record<AnaKategoriTip, string[]> = {
  "A": ALT_KATEGORILER_A,
  "B": ALT_KATEGORILER_B,
  "C": ALT_KATEGORILER_C,
  "D": ALT_KATEGORILER_D
};

// Tüm hedef kitleler (NLP kullanımı için)
export const HACIM_KRALLARI_HEDEF_KITLER = [...ALT_KATEGORILER_A, "Festsaal", "Hochzeitssaal", "Eventlocation", "Catering Service", "Partyservice", "Messe Catering", "Hotel", "Tagungshotel", "Messehotel", "Betriebsrestaurant", "Kantine", "Mensa"];
export const GUNLUK_NAKIT_AKISI_HEDEF_KITLER = [...ALT_KATEGORILER_B, "Cafe", "Kaffeehaus", "Stadtcafé", "Espressobar", "Kaffeerösterei", "Einkaufszentrum Café", "Bahnhofscafé", "Bistro", "Fırın", "Bäckerei", "Backshop"];
export const NIS_PAZARLAR_HEDEF_KITLER = [...ALT_KATEGORILER_C, "Shisha Lounge", "Hookah Lounge", "Lounge", "Cocktailbar", "American Diner", "İtalyan Restoran", "Asya Mutfağı", "Fusion Restaurant", "Kindercafé", "Museumscafé", "Indoorspielplatz"];
export const PERAKENDE_RAF_URUNLERI_HEDEF_KITLER = [...ALT_KATEGORILER_D, "Etnik Market", "Supermarkt", "Feinkost", "Lebensmittel", "Kiosk", "Büdchen", "Trinkhalle", "Tankstelle", "Raststätte", "Benzin İstasyonu", "Schulkiosk", "Schulbistro"];

/**
 * Kategori Renkleri (Ana Kategoriye göre)
 */
export const KATEGORI_RENKLERI: Record<AnaKategoriTip, string> = {
  "A": "bg-red-100 text-red-800 border-red-300",         // Kırmızı - En Yüksek Öncelik
  "B": "bg-blue-100 text-blue-800 border-blue-300",      // Mavi - Yüksek Öncelik
  "C": "bg-purple-100 text-purple-800 border-purple-300", // Mor - Orta Öncelik
  "D": "bg-amber-100 text-amber-800 border-amber-300"    // Amber - Düşük Öncelik
};

/**
 * Puanlama Sistemi (Ana Kategoriye göre)
 */
export const PUANLAMA_ARALIK: Record<AnaKategoriTip, { min: number; max: number; ort: number }> = {
  "A": { min: 80, max: 100, ort: 90 },   // HACİM KRALLARI
  "B": { min: 60, max: 79, ort: 70 },    // GÜNLÜK NAKİT AKIŞI
  "C": { min: 40, max: 59, ort: 50 },    // NİŞ PAZARLAR
  "D": { min: 1, max: 39, ort: 20 }      // PERAKENDE & RAF ÜRÜNLERİ
};

/**
 * Firma kategorisini belirlemek için NLP-benzeri fonksiyon
 * Firma adı, açıklama veya lokasyona göre otomatik kategori öneri
 */
export function tavsiyeEtKategori(
  firmaUnvani: string,
  aciklama?: string
): AnaKategoriTip | null {
  const metin = `${firmaUnvani} ${aciklama || ""}`.toLowerCase();

  // Kategori A (HACİM KRALLARI) kontrol
  for (const hedef of HACIM_KRALLARI_HEDEF_KITLER) {
    if (metin.includes(hedef.toLowerCase())) {
      return "A";
    }
  }

  // Kategori B (GÜNLÜK NAKİT AKIŞI) kontrol
  for (const hedef of GUNLUK_NAKIT_AKISI_HEDEF_KITLER) {
    if (metin.includes(hedef.toLowerCase())) {
      return "B";
    }
  }

  // Kategori C (NİŞ PAZARLAR) kontrol
  for (const hedef of NIS_PAZARLAR_HEDEF_KITLER) {
    if (metin.includes(hedef.toLowerCase())) {
      return "C";
    }
  }

  // Kategori D (PERAKENDE & RAF ÜRÜNLERİ) kontrol
  for (const hedef of PERAKENDE_RAF_URUNLERI_HEDEF_KITLER) {
    if (metin.includes(hedef.toLowerCase())) {
      return "D";
    }
  }

  return null;
}

/**
 * Kategoriye göre önerilen puanı al
 */
export function puanOnerisi(kategori: AnaKategoriTip): number {
  return PUANLAMA_ARALIK[kategori]?.ort || 50;
}

/**
 * Puana göre kategori tahmin et (ters işlem)
 */
export function puanDanKategoriTahmini(puan: number): AnaKategoriTip {
  if (puan >= 80) return "A";
  if (puan >= 60) return "B";
  if (puan >= 40) return "C";
  return "D";
}

/**
 * ESKI SİSTEM → YENİ SİSTEM DÖNÜŞÜMÜ (Migration Mapping)
 * Veritabanında eski kategoriler için dönüşüm
 */
export const ESKI_KATEGORI_MAPPING: Record<string, AnaKategoriTip> = {
  // Kendinden eski sistem kategorileri
  "Hacim Krallari": "A",
  "Gunluk Nakit Akisi": "B",
  "Nis Pazarlar": "C",
  "Perakende ve Raf Urunleri": "D",
  
  // Diğer eski kategoriler
  "Shisha & Lounge": "C",
  "Coffee Shop & Eiscafé": "B",
  "Casual Dining": "C",
  "Restoran": "C",
  "Hotel & Event": "A",
  "Catering": "A",
  "Alt Bayi": "D",
  "Rakip/Üretici": "D",
  "Kafe": "B",
  "Otel": "A",
  "Zincir Market": "D"
};

/**
 * Eski kategoriyi yeni sisteme dönüştür
 */
export function eskiKategoryiYeniSistemeleDonustur(
  eskiKategori: string | null | undefined
): AnaKategoriTip {
  if (!eskiKategori) return "D"; // Varsayılan olarak D
  
  const mapped = ESKI_KATEGORI_MAPPING[eskiKategori];
  return mapped || "D"; // Tanınmayan kategori → D
}
