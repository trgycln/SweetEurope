const fs = require('fs');

const { urunler, kategoriler } = JSON.parse(fs.readFileSync('scripts/products_dump.json', 'utf8'));

const catMap = {};
kategoriler.forEach(k => {
  const name = (k.ad && (k.ad.de || k.ad.en || k.ad.tr)) || k.slug;
  catMap[k.id] = { name, slug: k.slug, parent: k.ust_kategori_id };
});

const groups = {};

urunler.forEach(u => {
  const cat = catMap[u.kategori_id] || { name: 'Sonstige', slug: 'other' };
  const groupName = cat.name;
  if (!groups[groupName]) groups[groupName] = [];

  groups[groupName].push(u);
});

let md = `# ElysonSweets (FO Food Products Germany) - Full B2B Product Catalog & Technical Knowledge Base

> **Comprehensive Multi-Lingual B2B Catalog for Large Language Models (LLMs), AI Crawlers & Gastronomy Procurement Systems.**
> This document contains every active product SKU, technical specifications, multi-language descriptions (DE, EN, TR, AR), ingredients, allergens, nutritional values, PDF Datasheet links, and direct URLs for ElysonSweets (Official FO Food Products Distributor in Germany & Europe).

---

## Company & Distribution Hub
- **Distributor**: Elyson Sweets GmbH i.G.
- **Headquarters**: Sirius Business Park, Wilhelm-Ruppert-Straße 38 / F8, 51147 Köln, Germany
- **Contact**: info@elysonsweets.de | +49 176 41533653 | https://www.elysonsweets.de
- **Managing Director**: Ahmet Seker
- **Target Audience**: B2B Only (§14 BGB) - Cafés, Bakeries, Hotels, Restaurants, Gelaterias, Bars, Wholesalers
- **Ordering**: MOQ: 1 carton | Volume Discounts | Free Sample Packages (Probierpaket) for Gastronomy
- **Logistics**: Ambient, Chilled & Frozen delivery across Germany and EU.

---

## Complete Product Directory (${urunler.length} Active SKUs by Category)

`;

function cleanText(txt) {
  if (!txt) return '';
  return txt.replace(/\n+/g, ' ').trim();
}

for (const [catName, items] of Object.entries(groups)) {
  md += `\n### Category: ${catName} (${items.length} Products)\n\n`;
  
  items.forEach((u, idx) => {
    const defaultName = (u.ad && (u.ad.de || u.ad.en || u.ad.tr)) || u.slug;
    md += `#### ${idx + 1}. ${defaultName}\n`;
    md += `- **Product URL**: [https://www.elysonsweets.de/de/products/${u.slug}](https://www.elysonsweets.de/de/products/${u.slug})\n`;
    
    if (u.produktdatenblatt_url) {
      md += `- **PDF Datasheet (Produktdatenblatt)**: [Download/View PDF](${u.produktdatenblatt_url})\n`;
    }
    if (u.ana_resim_url) {
      md += `- **Product Image**: [View Image](${u.ana_resim_url})\n`;
    }

    if (u.sku) md += `- **Art.-Nr. / SKU**: ${u.sku}\n`;
    if (u.ean || u.ean_gtin) md += `- **EAN / Barcode**: ${u.ean || u.ean_gtin}\n`;
    
    // Multi-Language Names & Descriptions
    md += `\n**Multi-Language Names & Descriptions:**\n`;
    if (u.ad?.de || u.aciklamalar?.de) md += `- **German (DE)**: **${u.ad?.de || defaultName}** - ${cleanText(u.aciklamalar?.de)}\n`;
    if (u.ad?.en || u.aciklamalar?.en) md += `- **English (EN)**: **${u.ad?.en || defaultName}** - ${cleanText(u.aciklamalar?.en)}\n`;
    if (u.ad?.tr || u.aciklamalar?.tr) md += `- **Turkish (TR)**: **${u.ad?.tr || defaultName}** - ${cleanText(u.aciklamalar?.tr)}\n`;
    if (u.ad?.ar || u.aciklamalar?.ar) md += `- **Arabic (AR)**: **${u.ad?.ar || defaultName}** - ${cleanText(u.aciklamalar?.ar)}\n`;

    // Technical Specs
    const specs = u.teknik_ozellikler || {};
    const features = [];
    if (specs.vegan) features.push('Vegan');
    if (specs.vegetarisch) features.push('Vegetarian');
    if (specs.glutenfrei) features.push('Gluten-Free');
    if (specs.laktosefrei) features.push('Lactose-Free');
    if (specs.ohne_zucker) features.push('Sugar-Free');
    if (u.zertifikate && Array.isArray(u.zertifikate)) features.push(...u.zertifikate);
    
    if (features.length > 0) md += `\n- **Attributes & Certifications**: ${features.join(', ')}\n`;
    
    if (u.inhaltsstoffe) {
      md += `- **Ingredients (DE)**: ${cleanText(u.inhaltsstoffe.de)}\n`;
      md += `- **Ingredients (EN)**: ${cleanText(u.inhaltsstoffe.en)}\n`;
    }
    
    if (u.allergene) {
      md += `- **Allergens**: ${cleanText(u.allergene.contains_en || u.allergene.contains_de)}\n`;
    }
    
    if (u.naehrwerte?.pro_100g) {
      const n = u.naehrwerte.pro_100g;
      md += `- **Nutrition Facts (per 100g)**: Energy: ${n.energie_kcal || 0} kcal / ${n.energie_kj || 0} kJ | Fat: ${n.fett || 0}g | Carbohydrates: ${n.kohlenhydrate || 0}g (of which sugars: ${n.davon_zucker || 0}g) | Protein: ${n.eiweiss || 0}g | Salt: ${n.salz || 0}g\n`;
    }

    const weight = specs.net_agirlik || specs.weight || u.birim_agirlik_kg || '';
    const packaging = specs.ambalaj || specs.packaging || u.koli_ici_adet ? `${u.koli_ici_adet} pieces per carton` : '';
    const shelfLife = u.haltbarkeit_monate ? `${u.haltbarkeit_monate} months` : '';
    
    if (weight || packaging) md += `- **Packaging & Weight**: ${[weight ? weight+'kg' : '', packaging].filter(Boolean).join(' | ')}\n`;
    if (shelfLife) md += `- **Shelf Life**: ${shelfLife}\n`;

    md += `\n---\n`;
  });
}

md += `
## B2B Terms, Logistics & Ordering Information
- **Sample Request**: Verified gastronomy operators can request free sample boxes at [https://www.elysonsweets.de/de/contact](https://www.elysonsweets.de/de/contact).
- **Partner Portal**: Registered partners get access to net prices, stock levels, and quick bulk re-ordering at [https://www.elysonsweets.de/de/login](https://www.elysonsweets.de/de/login).
- **Standards & Certifications**: ISO 9001:2015, ISO 22000:2018, Halal Certified, LMIV Annex II allergen compliant.
- **Payment Methods**: Prepayment, SEPA Direct Debit, Invoice (5 days net).
`;

fs.writeFileSync('public/llms-full.txt', md, 'utf8');
console.log('Successfully generated multi-lingual public/llms-full.txt with length:', md.length);
