const fs = require('fs');

function updateFile(path) {
    let content = fs.readFileSync(path, 'utf8');

    // add import if missing
    if (!content.includes('computeTedarikDurumu')) {
        content = content.replace(/(import .* from '@\/lib\/utils';?)/, "\nimport { computeTedarikDurumu } from '@/lib/utils';");
        if (!content.includes('import { computeTedarikDurumu }')) {
            content = "import { computeTedarikDurumu } from '@/lib/utils';\n" + content;
        }
    }

    // replace (urun/produkt as any).tedarik_turu
    content = content.replace(/\(urun as any\)\.tedarik_turu/g, "computeTedarikDurumu(urun.stok_miktari, (urun as any).stok_tukenme_tarihi)");
    content = content.replace(/\(produkt as any\)\.tedarik_turu/g, "computeTedarikDurumu(produkt.stok_miktari, (produkt as any).stok_tukenme_tarihi)");

    // Since we also changed how tedarik_turu is read in backend (we are removing the field eventually), 
    // it's fine as long as we use the computed value.
    
    fs.writeFileSync(path, content, 'utf8');
    console.log('Updated ' + path);
}

updateFile('src/app/[locale]/(public)/products/product-grid-client.tsx');
updateFile('src/components/portal/katalog/KatalogProductCard.tsx');
