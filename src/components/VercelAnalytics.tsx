'use client';

import { Analytics } from '@vercel/analytics/react';
import { useEffect, useState } from 'react';

export default function VercelAnalytics() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      setConsent(localStorage.getItem('cookie_consent') === 'accepted');
    };
    checkConsent();
    window.addEventListener('cookie_consent_change', checkConsent);
    return () => window.removeEventListener('cookie_consent_change', checkConsent);
  }, []);

  if (process.env.NODE_ENV !== 'production' || !consent) {
    return null;
  }

  return <Analytics />;
}
