'use client';

import { useEffect } from 'react';
import { trackSearch } from '@/lib/metaPixelEvents';

interface Props {
  query: string;
}

/**
 * Arama sayfasına eklenen gizli Client bileşeni.
 * Arama sorgusu varsa Meta Pixel Search eventi gönderir.
 */
export default function MetaPixelSearchTracker({ query }: Props) {
  useEffect(() => {
    if (query && query.trim().length > 0) {
      trackSearch(query.trim());
    }
  }, [query]);

  return null;
}
