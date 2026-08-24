const fs = require('fs');

function updateDictionaries() {
    const p = 'src/dictionaries/de.ts';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/"Ausverkauft"/g, '"Nicht auf Lager"');
    content = content.replace(/'Ausverkauft'/g, "'Nicht auf Lager'");
    content = content.replace(/"Dieses Produkt ist ausverkauft\."/g, '"Dieses Produkt ist nicht auf Lager."');
    content = content.replace(/'Dieses Produkt ist ausverkauft\.'/g, "'Dieses Produkt ist nicht auf Lager.'");
    fs.writeFileSync(p, content, 'utf8');
}

function updateUrunFormu() {
    const p = 'src/app/[locale]/admin/urun-yonetimi/urunler/urun-formu.tsx';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/<div>\s*<label htmlFor="tedarik_turu"[\s\S]*?<\/select>\s*<p[^>]*>.*?<\/p>\s*<\/div>/g, "");
    fs.writeFileSync(p, content, 'utf8');
}

function updateUrunKatalogu() {
    const p = 'src/components/portal/UrunKatalogu.tsx';
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/'Ausverkauft'/g, "'Nicht auf Lager'");
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

updateDictionaries();
updateUrunFormu();
updateUrunKatalogu();
updatePortalUrunDetay();

