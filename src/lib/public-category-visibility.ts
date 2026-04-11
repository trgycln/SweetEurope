type CategoryLike = {
  id: string;
  slug?: string | null;
  ust_kategori_id?: string | null;
};

export const PUBLIC_HIDDEN_MAIN_CATEGORY_SLUGS = ['pizza-and-fast-food'] as const;

export const PUBLIC_VISIBLE_MAIN_CATEGORY_ORDER = [
  'cakes-and-tarts',
  'cookies-and-muffins',
  'sauces-and-ingredients',
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
