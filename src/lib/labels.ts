// Shared label helpers for localized badges and flavor names
export type AppLocale = 'de' | 'tr' | 'en' | 'ar';

export function getBadgeText(key: 'vegan' | 'glutenfrei' | 'laktosefrei' | 'bio' | 'vegetarisch', locale: AppLocale): string {
  switch (key) {
    case 'vegan':
      return locale === 'ar' ? 'نباتي' : locale === 'tr' ? 'Vegan' : locale === 'en' ? 'Vegan' : 'Vegan';
    case 'glutenfrei':
      return locale === 'ar' ? 'خالي من الغلوتين' : locale === 'tr' ? 'Glutensiz' : locale === 'en' ? 'Gluten-free' : 'Glutenfrei';
    case 'laktosefrei':
      return locale === 'ar' ? 'خالي من اللاكتوز' : locale === 'tr' ? 'Laktozsuz' : locale === 'en' ? 'Lactose-free' : 'Laktosefrei';
    case 'bio':
      return locale === 'ar' ? 'عضوي' : locale === 'tr' ? 'Organik' : locale === 'en' ? 'Organic' : 'Bio';
    case 'vegetarisch':
      // Vegetarian differs from vegan; provide distinct localized term
      return locale === 'ar' ? 'نباتي (غير صارم)' : locale === 'tr' ? 'Vejetaryen' : locale === 'en' ? 'Vegetarian' : 'Vegetarisch';
    default:
      return key;
  }
}

// Internal flavor tokens mapped to localized display names
const FLAVOR_MAP: Record<string, { de: string; tr: string; en: string; ar: string }> = {
  schokolade: { de: 'Schokolade', tr: 'Çikolata', en: 'Chocolate', ar: 'شوكولاتة' },
  kakao: { de: 'Kakao', tr: 'Kakao', en: 'Cocoa', ar: 'كاكاو' },
  erdbeere: { de: 'Erdbeere', tr: 'Çilek', en: 'Strawberry', ar: 'فراولة' },
  vanille: { de: 'Vanille', tr: 'Vanilya', en: 'Vanilla', ar: 'فانيليا' },
  karamell: { de: 'Karamell', tr: 'Karamel', en: 'Caramel', ar: 'كراميل' },
  nuss: { de: 'Haselnuss', tr: 'Fındık', en: 'Hazelnut', ar: 'بندق' },
  walnuss: { de: 'Walnuss', tr: 'Ceviz', en: 'Walnut', ar: 'جوز' },
  badem: { de: 'Mandel', tr: 'Badem', en: 'Almond', ar: 'لوز' },
  pistazie: { de: 'Pistazie', tr: 'Antep Fıstığı', en: 'Pistachio', ar: 'فستق حلبي' },
  himbeere: { de: 'Himbeere', tr: 'Ahududu', en: 'Raspberry', ar: 'توت العليق' },
  kirsche: { de: 'Kirsche', tr: 'Vişne', en: 'Cherry', ar: 'كرز' },
  // Alias token for Turkish input 'visne' (normalized to kirsche in actions)
  visne: { de: 'Kirsche', tr: 'Vişne', en: 'Cherry', ar: 'كرز' },
  waldfrucht: { de: 'Waldfrucht', tr: 'Orman meyveli', en: 'Forest fruit', ar: 'فاكهة الغابة' },
  frucht: { de: 'Frucht', tr: 'Meyveli', en: 'Fruity', ar: 'فاكهة' },
  zitrone: { de: 'Zitrone', tr: 'Limon', en: 'Lemon', ar: 'ليمون' },
  kaffee: { de: 'Kaffee', tr: 'Kahve', en: 'Coffee', ar: 'قهوة' },
  honig: { de: 'Honig', tr: 'Bal', en: 'Honey', ar: 'عسل' },
  hindistancevizi: { de: 'Kokos', tr: 'Hindistan cevizi', en: 'Coconut', ar: 'جوز الهند' },
  zeytin: { de: 'Olive', tr: 'Zeytin', en: 'Olive', ar: 'زيتون' },
  havuc: { de: 'Karotte', tr: 'Havuç', en: 'Carrot', ar: 'جزر' },
  yulaf: { de: 'Hafer', tr: 'Yulaf', en: 'Oat', ar: 'شوفان' },
  portakal: { de: 'Orange', tr: 'Portakal', en: 'Orange', ar: 'برتقال' },
  // Turkish butter token
  tereyag: { de: 'Butter', tr: 'Tereyağ', en: 'Butter', ar: 'زبدة' },
  // Blueberry
  yabanmersini: { de: 'Heidelbeere', tr: 'Yaban Mersini', en: 'Blueberry', ar: 'توت أزرق' },
};

export function getFlavorLabel(token: string, locale: AppLocale): string {
  const entry = FLAVOR_MAP[token?.toLowerCase?.() || token];
  if (!entry) return token; // fallback to raw token
  return entry[locale] || entry.de;
}

export function piecesSuffix(locale: AppLocale): string {
  return locale === 'ar' ? 'قطعة' : locale === 'tr' ? 'adet' : locale === 'en' ? 'pieces' : 'Stück';
}

export function weightLabel(locale: AppLocale): string {
  return locale === 'ar' ? 'الوزن' : locale === 'tr' ? 'Ağırlık' : locale === 'en' ? 'Weight' : 'Gewicht';
}

export function perSliceSuffix(locale: AppLocale): string {
  // Suffix used in compact chip like "120 g/…"
  return locale === 'ar' ? 'شريحة' : locale === 'tr' ? 'dilim' : locale === 'en' ? 'slice' : 'Stk.';
}
