'use client';

import { Analytics } from '@vercel/analytics/react';

export default function VercelAnalytics() {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  return <Analytics />;
}
