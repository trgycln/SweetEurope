import Script from 'next/script';

interface BrandItem {
  name: string;
  url: string;
  logo?: string;
}

interface BrandListSchemaProps {
  brands: BrandItem[];
}

export default function BrandListSchema({ brands }: BrandListSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Our Partner Brands - Elysonsweets GmbH",
    "description": "Official B2B wholesale distributor for premium HORECA brands.",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": brands.map((brand, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Brand",
          "name": brand.name,
          "url": brand.url,
          ...(brand.logo && { "logo": brand.logo })
        }
      }))
    }
  };

  return (
    <Script
      id="brand-list-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="beforeInteractive"
    />
  );
}
