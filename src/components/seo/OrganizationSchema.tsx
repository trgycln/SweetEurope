import Script from 'next/script';

export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "WholesaleStore"],
    "name": "Elysonsweets GmbH",
    "description": "B2B HORECA supplier specializing in cocktail syrups and bar sauces.",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "https://elysonsweets.de",
    "logo": `${process.env.NEXT_PUBLIC_SITE_URL || "https://elysonsweets.de"}/logo.png`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Sirius Park Wahn",
      "addressLocality": "Köln",
      "addressRegion": "Nordrhein-Westfalen",
      "addressCountry": "DE"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "B2B Sales & Customer Service",
      "areaServed": ["DE", "TR", "AE", "GB", "US"],
      "availableLanguage": ["German", "English", "Turkish", "Arabic"]
    }
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="beforeInteractive"
    />
  );
}
