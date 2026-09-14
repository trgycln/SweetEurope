'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useState } from 'react';

/**
 * DSGVO/TTDSG-konform Meta Pixel Loader
 *
 * Pixel yalnızca ziyaretçi "Alle akzeptieren" butonuna bastıktan sonra,
 * yani cookie_consent = 'accepted' kaydedildikten sonra yüklenir.
 * Sayfa ilk açıldığında kesinlikle çalışmaz.
 */
export default function MetaPixel() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    // Sayfa yüklendiğinde daha önce onay verilmiş mi kontrol et
    const stored = localStorage.getItem('cookie_consent');
    if (stored === 'accepted') {
      setConsentGiven(true);
    }

    // CookieBanner'ın dispatch ettiği event'i dinle
    const handleConsentChange = () => {
      const current = localStorage.getItem('cookie_consent');
      if (current === 'accepted') {
        setConsentGiven(true);
      }
    };

    window.addEventListener('cookie_consent_change', handleConsentChange);
    return () => {
      window.removeEventListener('cookie_consent_change', handleConsentChange);
    };
  }, []);

  // Onay yoksa hiçbir şey render etme
  if (!consentGiven) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1078980291662599');
fbq('track', 'PageView');
          `,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=1078980291662599&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
    </>
  );
}
