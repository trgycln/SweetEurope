'use client';

import React, { useMemo } from 'react';
import {
  CategoryItem,
  buildUnifiedCategoryTree,
  getLocalizedCategoryName,
} from '@/lib/category-tree';

export interface CategoryFilterSelectProps {
  categories: CategoryItem[];
  value: string;
  onChange: (value: string) => void;
  locale?: string;
  categoryCounts?: Record<string, number>;
  allCategoriesLabel?: string;
  className?: string;
  disabled?: boolean;
  showCounts?: boolean;
  useSlug?: boolean;
  id?: string;
  name?: string;
}

export function CategoryFilterSelect({
  categories = [],
  value = '',
  onChange,
  locale = 'de',
  categoryCounts = {},
  allCategoriesLabel,
  className = 'rounded-md border border-slate-200 px-3 py-1.5 text-sm bg-white',
  disabled = false,
  showCounts = true,
  useSlug = false,
  id,
  name,
}: CategoryFilterSelectProps) {
  const tree = useMemo(() => {
    return buildUnifiedCategoryTree(categories, categoryCounts, locale);
  }, [categories, categoryCounts, locale]);

  const defaultAllLabel = useMemo(() => {
    if (allCategoriesLabel) return allCategoriesLabel;
    switch (locale) {
      case 'tr':
        return 'Tüm Kategoriler';
      case 'en':
        return 'All Categories';
      case 'ar':
        return 'جميع الفئات';
      case 'de':
      default:
        return 'Alle Kategorien';
    }
  }, [allCategoriesLabel, locale]);

  const allPrefix = useMemo(() => {
    switch (locale) {
      case 'tr':
        return 'Tüm';
      case 'en':
        return 'All';
      case 'ar':
        return 'كل';
      case 'de':
      default:
        return 'Alle';
    }
  }, [locale]);

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      <option value="">{defaultAllLabel}</option>
      {tree.map((root) => {
        const rootVal = useSlug ? root.slug || root.id : root.id;
        const hasSubs = root.subCategories.length > 0;

        if (!hasSubs) {
          return (
            <option key={root.id} value={rootVal}>
              {root.name}
              {showCounts && (root.count ?? 0) > 0 ? ` (${root.count})` : ''}
            </option>
          );
        }

        return (
          <optgroup key={root.id} label={root.name}>
            <option value={rootVal}>
              {allPrefix} {root.name}
              {showCounts && (root.count ?? 0) > 0 ? ` (${root.count})` : ''}
            </option>
            {root.subCategories.map((sub) => {
              const subVal = useSlug ? sub.slug || sub.id : sub.id;
              return (
                <option key={sub.id} value={subVal}>
                  &nbsp;&nbsp;{sub.name}
                  {showCounts && (sub.count ?? 0) > 0 ? ` (${sub.count})` : ''}
                </option>
              );
            })}
          </optgroup>
        );
      })}
    </select>
  );
}

export default CategoryFilterSelect;
