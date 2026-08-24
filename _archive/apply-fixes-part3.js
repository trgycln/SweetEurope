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
updateDictionaries();
updateUrunFormu();
updateUrunKatalogu();
