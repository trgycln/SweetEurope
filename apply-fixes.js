const fs = require('fs');

function addUtils() {
    const p = 'src/lib/utils.ts';
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('computeTedarikDurumu')) {
        content += \nexport function computeTedarikDurumu(stok: number | null | undefined, tukenmeTarihi: string | null | undefined): 'stokta' | 'tukendi' | 'talep_uzerine' {
    const s = stok ?? 0;
    if (s > 0) return 'stokta';
    if (!tukenmeTarihi) return 'talep_uzerine';
    const tukenme = new Date(tukenmeTarihi).getTime();
    if (isNaN(tukenme)) return 'talep_uzerine';
    const ucAyiGecti = (Date.now() - tukenme) > (90 * 24 * 60 * 60 * 1000);
    return ucAyiGecti ? 'talep_uzerine' : 'tukendi';
}\n;
        fs.writeFileSync(p, content, 'utf8');
    }
}

function updateDatabaseTypes() {
    const p = 'src/lib/supabase/database.types.ts';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/stok_miktari: number/g, 'stok_miktari: number\n            stok_tukenme_tarihi: string | null');
    content = content.replace(/stok_miktari\?: number/g, 'stok_miktari?: number\n            stok_tukenme_tarihi?: string | null');
    fs.writeFileSync(p, content, 'utf8');
}

function updateProductGridClient() {
    const p = 'src/app/[locale]/(public)/products/product-grid-client.tsx';
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('computeTedarikDurumu')) {
        content = content.replace(/'use client';/, "'use client';\nimport { computeTedarikDurumu } from '@/lib/utils';");
    }
    content = content.replace(/\(urun as any\)\.tedarik_turu/g, "computeTedarikDurumu(urun.stok_miktari, (urun as any).stok_tukenme_tarihi)");
    content = content.replace(/\(produkt as any\)\.tedarik_turu/g, "computeTedarikDurumu(produkt.stok_miktari, (produkt as any).stok_tukenme_tarihi)");
    fs.writeFileSync(p, content, 'utf8');
}

function updateKatalogProductCard() {
    const p = 'src/components/portal/katalog/KatalogProductCard.tsx';
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('computeTedarikDurumu')) {
        content = "import { computeTedarikDurumu } from '@/lib/utils';\n" + content;
    }
    content = content.replace(/\(produkt as any\)\.tedarik_turu/g, "computeTedarikDurumu(produkt.stok_miktari, (produkt as any).stok_tukenme_tarihi)");
    
    // Replace the grid view badge rendering
    const targetBlock = const miktar = produkt.stok_miktari ?? null;\n                  const esik = produkt.stok_esigi ?? 10;\n                  if (miktar === null) return null;\n                  if (miktar <= 0) return (\n                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">\n                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>\n                      {locale === 'de' ? 'Nicht auf Lager' : 'Stok yok'}\n                    </span>\n                  );;
    
    const newBlock = const miktar = produkt.stok_miktari ?? 0;\n                  const esik = produkt.stok_esigi ?? 10;\n                  const durum = computeTedarikDurumu(miktar, (produkt as any).stok_tukenme_tarihi);\n                  if (durum === 'talep_uzerine') return (\n                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">\n                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"/>\n                      {locale === 'de' ? 'Bestellartikel' : 'Özel Sipariş'}\n                    </span>\n                  );\n                  if (miktar <= 0) return (\n                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">\n                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/>\n                      {locale === 'de' ? 'Nicht auf Lager' : 'Stokta yok'}\n                    </span>\n                  );;
    
    // We'll replace it carefully. But because exact match might fail due to whitespace, we can use regex.
    content = content.replace(/const miktar = produkt\.stok_miktari \?\? null;[\s\S]*?if \(miktar <= 0\) return \([\s\S]*?<\/span>\s*\);\s*/, newBlock + '\n                  ');
    
    fs.writeFileSync(p, content, 'utf8');
}

function updateUrunFormu() {
    const p = 'src/app/[locale]/admin/urun-yonetimi/urunler/urun-formu.tsx';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/<div>\s*<label htmlFor="tedarik_turu"[\s\S]*?<\/select>\s*<p[^>]*>.*?<\/p>\s*<\/div>/g, "");
    fs.writeFileSync(p, content, 'utf8');
}

function updateDictionaries() {
    const p = 'src/dictionaries/de.ts';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/"Ausverkauft"/g, '"Nicht auf Lager"');
    content = content.replace(/'Ausverkauft'/g, "'Nicht auf Lager'");
    content = content.replace(/"Dieses Produkt ist ausverkauft\."/g, '"Dieses Produkt ist nicht auf Lager."');
    content = content.replace(/'Dieses Produkt ist ausverkauft\.'/g, "'Dieses Produkt ist nicht auf Lager.'");
    fs.writeFileSync(p, content, 'utf8');
}

function updatePortalUrunDetay() {
    const p = 'src/components/portal/katalog/PortalUrunDetay.tsx';
    let content = fs.readFileSync(p, 'utf8');
    if (!content.includes('computeTedarikDurumu')) {
        content = content.replace(/getLocalizedName, formatCurrency } from/, 'getLocalizedName, formatCurrency, computeTedarikDurumu } from');
    }
    const rx = /if \(currentMenge <= 0\) \{[\s\S]*?status = \{ text: content\.availabilityInStock[\s\S]*?\} \}/;
    const rep = const durum = computeTedarikDurumu(currentMenge, (urun as any).stok_tukenme_tarihi);
    if (durum === 'talep_uzerine') {
        status = { text: locale === 'de' ? 'Bestellartikel' : 'Özel Sipariş', color: "text-violet-600", icon: <FiAlertTriangle /> };
    } else if (durum === 'tukendi') {
        status = { text: locale === 'de' ? 'Nicht auf Lager' : 'Stokta yok', color: "text-red-600", icon: <FiXCircle /> };
    } else if (currentMenge <= warnSchwelle) {
        status = { text: content.availabilityLowStock || "Wenig Bestand", color: "text-yellow-600", icon: <FiAlertTriangle /> };
    } else {
        status = { text: content.availabilityInStock || "Auf Lager", color: "text-green-600", icon: <FiCheckCircle /> };
    };
    content = content.replace(rx, rep);
    content = content.replace(/toast\.error\("Dieses Produkt ist ausverkauft\."\);/g, 'toast.error(locale === "de" ? "Dieses Produkt ist nicht auf Lager." : "Stokta yok.");');
    fs.writeFileSync(p, content, 'utf8');
}

function updateUrunKatalogu() {
    const p = 'src/components/portal/UrunKatalogu.tsx';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/'Ausverkauft'/g, "'Nicht auf Lager'");
    fs.writeFileSync(p, content, 'utf8');
}

addUtils();
updateDatabaseTypes();
updateProductGridClient();
updateKatalogProductCard();
updateUrunFormu();
updateDictionaries();
updatePortalUrunDetay();
updateUrunKatalogu();
console.log('done');
