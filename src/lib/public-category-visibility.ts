type CategoryLike = {
  id: string;
  slug?: string | null;
  ust_kategori_id?: string | null;
};

// FO brand's 14 product categories (Barista, Sirupe & Backzutaten)
export const FO_CATEGORY_SLUGS = [
  'powder-drinks',
  'fruit-pastes',
  'topping-decor-sauces',
  'topping-ice-cream-sauces',
  'special-sauces-940g',
  'fruited-sauces',
  'premium-syrups',
  'cocktail-syrups',
  'silvery-syrups',
  'iced-tea-syrup-bases',
  'cafe-bar-sauces',
  'cocktail-mixes',
  'foamer',
  'special-pistachio-sauce',
] as const;

export type FoCategorySlug = typeof FO_CATEGORY_SLUGS[number];

// Sweet Heaven categories are hidden (is_public: false, status: coming_soon)
export const SWEET_HEAVEN_CATEGORY_SLUGS = [
  'cakes-and-tarts',
  'cookies-and-muffins',
] as const;

export const PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS = [
  'pizza-and-fast-food',
  'cakes-and-tarts',
  'cookies-and-muffins',
] as const;

export const PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER = [
  'sauces-and-ingredients',
  'syrups',
  'premium-cocktail-syrups',
  'flavored-cocktail-syrups',
  'cafe-bar-sauces',
  'fruit-sauces',
  'professional-bar-sauces',
  'powdered-beverages',
  'ice-cream-gelato',
  'pastry-bakery',
  'iconic-products',
  'anatolian-legends-ready-mixes',
  'frozen-purees',
  // FO-specific categories (active once DB migration runs)
  ...FO_CATEGORY_SLUGS,
  // Legacy FO categories kept as fallback until migration completes
  'coffee',
  'drinks',
] as const;

const HIDDEN_MENU_PATH_SEGMENTS = ['/pizza', '/pizzas'];

export function isPublicCategorySlugHidden(slug?: string | null): boolean {
  if (!slug) return false;
  return PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS.includes(
    slug as (typeof PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS)[number]
  );
}

export function buildHiddenPublicCategoryIds(categories: CategoryLike[] = []): Set<string> {
  const hiddenIds = new Set<string>();
  const queue = categories
    .filter((category) => isPublicCategorySlugHidden(category.slug))
    .map((category) => category.id);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || hiddenIds.has(currentId)) continue;

    hiddenIds.add(currentId);

    categories
      .filter((category) => category.ust_kategori_id === currentId)
      .forEach((category) => queue.push(category.id));
  }

  return hiddenIds;
}

export function isPublicMegaMenuCategoryHidden(category: {
  subCategories?: Array<{ href?: string | null }>;
}): boolean {
  return (category.subCategories || []).some((subCategory) =>
    HIDDEN_MENU_PATH_SEGMENTS.some((segment) => subCategory.href?.includes(segment))
  );
}
