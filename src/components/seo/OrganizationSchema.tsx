export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://elysonsweets.de/#organization",
        "name": "Elysonsweets GmbH",
        "url": "https://elysonsweets.de",
        "logo": "https://elysonsweets.de/logo.png",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+49 2203 9899714",
          "contactType": "customer service",
          "areaServed": ["DE", "EN", "TR", "AR"],
          "availableLanguage": ["German", "English", "Turkish", "Arabic"]
        },
        "sameAs": [
          "https://www.linkedin.com/company/elysonsweets",
          "https://www.instagram.com/elysonsweets.de"
        ]
      },
      {
        "@type": "WholesaleStore",
        "@id": "https://elysonsweets.de/#store",
        "name": "Elysonsweets B2B HORECA Supply",
        "parentOrganization": { "@id": "https://elysonsweets.de/#organization" },
        "description": "B2B wholesale supplier of FO Syrups, cocktail ingredients, and bar sauces.",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Wilhelm-Ruppert-Straße 38",
          "addressLocality": "Köln",
          "postalCode": "51147",
          "addressCountry": "DE"
        },
        "priceRange": "$$"
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
