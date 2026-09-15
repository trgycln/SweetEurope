'use client';

import { useEffect } from 'react';
import { trackViewContent } from '@/lib/metaPixelEvents';

interface Props {
  contentId: string;
  contentName: string;
  contentCategory?: string;
}

/**
 * Ürün detay sayfasına yerleştirilen gizli Client bileşeni.
 * Mount olduğunda Meta Pixel'e ViewContent event'i gönderir.
 */
export default function MetaPixelViewContent({ contentId, contentName, contentCategory }: Props) {
  useEffect(() => {
    trackViewContent({
      content_ids: [contentId],
      content_name: contentName,
      content_category: contentCategory,
    });
  }, [contentId, contentName, contentCategory]);

  return null;
}
