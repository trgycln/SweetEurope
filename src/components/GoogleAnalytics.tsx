'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = 'G-4FNJCMYYY8';
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      setConsent(localStorage.getItem('cookie_consent') === 'accepted');
    };
    checkConsent();
    window.addEventListener('cookie_consent_change', checkConsent);
    return () => window.removeEventListener('cookie_consent_change', checkConsent);
  }, []);

  if (!consent) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
