const fs = require('fs');

const p1 = 'src/app/[locale]/(public)/products/product-grid-client.tsx';
let c1 = fs.readFileSync(p1, 'utf8');

// 1. Add import
if (!c1.includes('computeTedarikDurumu')) {
    c1 = c1.replace(/'use client';/, "'use client';\nimport { computeTedarikDurumu } from '@/lib/utils';");
}

// 2. Replace the evaluation logic
c1 = c1.replace(/\(urun as any\)\.tedarik_turu/g, "computeTedarikDurumu(urun.stok_miktari, (urun as any).stok_tukenme_tarihi)");
c1 = c1.replace(/\(produkt as any\)\.tedarik_turu/g, "computeTedarikDurumu(produkt.stok_miktari, (produkt as any).stok_tukenme_tarihi)");

fs.writeFileSync(p1, c1, 'utf8');

const p2 = 'src/components/portal/katalog/KatalogProductCard.tsx';
let c2 = fs.readFileSync(p2, 'utf8');

// 1. Add import
if (!c2.includes('computeTedarikDurumu')) {
    c2 = "import { computeTedarikDurumu } from '@/lib/utils';\n" + c2;
}

// 2. Replace the list view evaluation
c2 = c2.replace(/\(produkt as any\)\.tedarik_turu/g, "computeTedarikDurumu(produkt.stok_miktari, (produkt as any).stok_tukenme_tarihi)");
c2 = c2.replace(/tedarikTuru === 'talep_uzerine'/g, "computeTedarikDurumu(stokMiktar, (produkt as any).stok_tukenme_tarihi) === 'talep_uzerine'");

fs.writeFileSync(p2, c2, 'utf8');

