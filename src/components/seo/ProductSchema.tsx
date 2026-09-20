import Script from 'next/script';

interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  sku?: string;
  price?: number | string;
  currency?: string;
}

export default function ProductSchema({ name, description, image, sku, price, currency = 'EUR' }: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "image": image ? [image] : [],
    "sku": sku,
    "brand": {
      "@type": "Brand",
      "name": "Elysonsweets"
    },
    ...(price && {
      "offers": {
        "@type": "Offer",
        "priceCurrency": currency,
        "price": price,
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Elysonsweets GmbH"
        }
      }
    })
  };

  return (
    <Script
      id={`product-schema-${sku || name.replace(/\s+/g, '-')}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="beforeInteractive"
    />
  );
}
