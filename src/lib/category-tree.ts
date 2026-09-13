export interface CategoryItem {
  id: string;
  ad: any;
  slug?: string | null;
  ust_kategori_id?: string | null;
}

export interface CategoryTreeNode {
  id: string;
  slug?: string | null;
  name: string;
  count?: number;
  subCategories: Array<{
    id: string;
    slug?: string | null;
    name: string;
    count?: number;
  }>;
}

export const MAIN_CATEGORY_SLUG_ORDER = [
  'syrups',
  'cafe-bar-sauces',
  'powdered-beverages',
  'premium',
  'cocktail-mixes',
  'foamer',
] as const;

export function getLocalizedCategoryName(adObj: any, locale: string = 'de', fallback: string = 'Unbenannt'): string {
  if (!adObj) return fallback;
  if (typeof adObj === 'string') return adObj;
  return adObj[locale] || adObj['de'] || adObj['tr'] || adObj['en'] || Object.values(adObj)[0] as string || fallback;
}

/**
 * Builds structured, clean 2-level category tree with known canonical order
 */
export function buildUnifiedCategoryTree(
  categories: CategoryItem[] = [],
  categoryCounts: Record<string, number> = {},
  locale: string = 'de'
): CategoryTreeNode[] {
  // Root categories
  const roots = categories.filter((c) => !c.ust_kategori_id);

  // Sort roots by canonical order
  roots.sort((a, b) => {
    const slugA = a.slug || '';
    const slugB = b.slug || '';
    const idxA = MAIN_CATEGORY_SLUG_ORDER.indexOf(slugA as any);
    const idxB = MAIN_CATEGORY_SLUG_ORDER.indexOf(slugB as any);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return getLocalizedCategoryName(a.ad, locale).localeCompare(getLocalizedCategoryName(b.ad, locale));
  });

  return roots.map((root) => {
    const subs = categories
      .filter((c) => c.ust_kategori_id === root.id)
      .sort((a, b) =>
        getLocalizedCategoryName(a.ad, locale).localeCompare(getLocalizedCategoryName(b.ad, locale))
      );

    const directCount = categoryCounts[root.id] || 0;
    const subTotalCount = subs.reduce((sum, s) => sum + (categoryCounts[s.id] || 0), 0);
    const totalCount = directCount + subTotalCount;

    return {
      id: root.id,
      slug: root.slug,
      name: getLocalizedCategoryName(root.ad, locale),
      count: totalCount,
      subCategories: subs.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: getLocalizedCategoryName(s.ad, locale),
        count: categoryCounts[s.id] || 0,
      })),
    };
  });
}

/**
 * Returns the category id itself and all its descendant category IDs recursively.
 */
export function getAllCategoryDescendantIds(
  targetIdOrSlug: string,
  categories: CategoryItem[] = []
): string[] {
  if (!targetIdOrSlug) return [];

  const found = categories.find((c) => c.id === targetIdOrSlug || c.slug === targetIdOrSlug);
  const startId = found ? found.id : targetIdOrSlug;

  const result = new Set<string>([startId]);
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    categories
      .filter((c) => c.ust_kategori_id === currentId)
      .forEach((child) => {
        if (!result.has(child.id)) {
          result.add(child.id);
          queue.push(child.id);
        }
      });
  }

  return Array.from(result);
}
