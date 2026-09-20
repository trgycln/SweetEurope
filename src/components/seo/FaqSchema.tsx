import Script from 'next/script';

export default function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the minimum order quantity (MOQ) for B2B wholesale?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "As a B2B HORECA supplier, Elysonsweets GmbH offers flexible minimum order quantities tailored for cafes, bars, and restaurants. Please contact our sales team for specific MOQ details based on your location."
        }
      },
      {
        "@type": "Question",
        "name": "Do you ship cocktail syrups and bar sauces internationally?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, from our logistics center in Sirius Park Wahn, Köln, we supply premium syrups and sauces across Germany, Europe, Turkey, and the MENA region."
        }
      },
      {
        "@type": "Question",
        "name": "How can I get a B2B wholesale account?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can apply for a B2B wholesale account directly through our website. Once approved, you will gain access to our exclusive HORECA pricing and bulk ordering system."
        }
      }
    ]
  };

  return (
    <Script
      id="faq-schema-b2b"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="beforeInteractive"
    />
  );
}
