import type { AppLocale } from './labels';

export type ProductLineKey = 'frozen-desserts' | 'barista-bakery-essentials';
export type SupplierProfile = 'cold-chain' | 'non-cold';

type ProductLineMeta = {
  key: ProductLineKey;
  supplierProfile: SupplierProfile;
  mainCategorySlugs: string[];
  labels: Record<AppLocale, string>;
  descriptions: Record<AppLocale, string>;
};

export const PRODUCT_LINE_ORDER: ProductLineKey[] = [
  'frozen-desserts',
  'barista-bakery-essentials',
];

export const PRODUCT_LINE_META: Record<ProductLineKey, ProductLineMeta> = {
  'frozen-desserts': {
    key: 'frozen-desserts',
    supplierProfile: 'cold-chain',
    mainCategorySlugs: ['cakes-and-tarts', 'cookies-and-muffins', 'pizza-and-fast-food'],
    labels: {
      de: 'Frozen Desserts',
      en: 'Frozen Desserts',
      tr: 'Donuk Tatlılar',
      ar: 'حلويات مجمدة',
    },
    descriptions: {
      de: 'Torten, Cheesecakes, Cookies und portionierte Desserts für HoReCa.',
      en: 'Cakes, cheesecakes, cookies and portioned desserts for HoReCa.',
      tr: 'HoReCa için donuk pasta, cheesecake, kurabiye ve porsiyon tatlı çözümleri.',
      ar: 'حلول كيك وتشيز كيك وحلويات مجمدة مخصصة للمطاعم والمقاهي.',
    },
  },
  'barista-bakery-essentials': {
    key: 'barista-bakery-essentials',
    supplierProfile: 'non-cold',
    mainCategorySlugs: ['sauces-and-ingredients', 'coffee', 'drinks'],
    labels: {
      de: 'Barista, Sirupe & Backzutaten',
      en: 'Barista & Bakery Essentials',
      tr: 'Barista ve Pastane İhtiyaçları',
      ar: 'مستلزمات الباريستا والحلويات',
    },
    descriptions: {
      de: 'Kaffee, Sirupe, Soßen und Backzutaten für Cafés, Hotels und Patisserien.',
      en: 'Coffee, syrups, sauces and bakery ingredients for cafés, hotels and pastry kitchens.',
      tr: 'Kafeler, oteller ve pastaneler için kahve, şurup, sos ve üretim malzemeleri.',
      ar: 'قهوة وشراب وصلصات ومكونات للحلويات للمقاهي والفنادق والمخابز.',
    },
  },
};

export const PRODUCT_LINE_FEATURES: Record<ProductLineKey, string[]> = {
  'frozen-desserts': ['vegan', 'vegetarisch', 'glutenfrei', 'laktosefrei', 'bio'],
  'barista-bakery-essentials': [
    'ohne_zucker',
    'dogal_icerik',
    'katkisiz',
    'koruyucusuz',
    'pompa_uyumlu',
    'bio',
  ],
};

export function isProductLineKey(value?: string | null): value is ProductLineKey {
  return value === 'frozen-desserts' || value === 'barista-bakery-essentials';
}

export function getProductLineLabel(line: ProductLineKey, locale: AppLocale): string {
  return PRODUCT_LINE_META[line].labels[locale] || PRODUCT_LINE_META[line].labels.de;
}

export function getProductLineDescription(line: ProductLineKey, locale: AppLocale): string {
  return PRODUCT_LINE_META[line].descriptions[locale] || PRODUCT_LINE_META[line].descriptions.de;
}

export function inferProductLineFromCategorySlug(slug?: string | null): ProductLineKey | null {
  if (!slug) return null;

  for (const line of PRODUCT_LINE_ORDER) {
    if (PRODUCT_LINE_META[line].mainCategorySlugs.includes(slug)) {
      return line;
    }
  }

  const foKeywords = ['coffee', 'drink', 'syrup', 'sauce', 'ingredient', 'topping'];
  if (foKeywords.some((keyword) => slug.includes(keyword))) {
    return 'barista-bakery-essentials';
  }

  return 'frozen-desserts';
}

type CategoryLike = {
  id: string;
  slug?: string | null;
  ust_kategori_id?: string | null;
  urun_gami?: string | null;
};

export function inferProductLineFromCategoryId(
  categories: CategoryLike[] = [],
  categoryId?: string | null
): ProductLineKey | null {
  if (!categoryId) return null;

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  let current = categoryMap.get(categoryId);
  let guard = 0;

  while (current && guard < 10) {
    if (isProductLineKey(current.urun_gami)) {
      return current.urun_gami;
    }

    const inferred = inferProductLineFromCategorySlug(current.slug);
    if (inferred) {
      return inferred;
    }

    if (!current.ust_kategori_id) {
      break;
    }

    current = categoryMap.get(current.ust_kategori_id);
    guard += 1;
  }

  return null;
}

export function inferSupplierProfileFromProductLine(line?: ProductLineKey | null): SupplierProfile {
  if (line === 'frozen-desserts') return 'cold-chain';
  return 'non-cold';
}

export function getProductLineOptions(locale: AppLocale) {
  return PRODUCT_LINE_ORDER.map((line) => ({
    value: line,
    label: getProductLineLabel(line, locale),
    description: getProductLineDescription(line, locale),
  }));
}
