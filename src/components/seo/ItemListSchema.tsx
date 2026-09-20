import Script from 'next/script';

interface ListItem {
  name: string;
  url: string;
  image?: string;
}

interface ItemListSchemaProps {
  name: string;
  description: string;
  items: ListItem[];
}

export default function ItemListSchema({ name, description, items }: ItemListSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": name,
    "description": description,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": item.url,
        "name": item.name,
        ...(item.image && { "image": item.image })
      }))
    }
  };

  return (
    <Script
      id={`itemlist-schema-${name.replace(/\s+/g, '-').toLowerCase()}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="beforeInteractive"
    />
  );
}
