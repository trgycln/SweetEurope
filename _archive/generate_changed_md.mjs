import fs from 'fs';

const log = JSON.parse(fs.readFileSync('update_log.json', 'utf8'));

let changedItems = log.filter(item => item.oldPrice !== null && item.oldPrice !== 0 && item.oldPrice !== item.newPrice);

let md = `# Değişen Fiyatlar Listesi (69 Ürün)

Aşağıdaki tabloda, veritabanınızda eşleşip fiyatı değişen ürünlerin PDF'ten çekilen yeni fiyatlarını görebilirsiniz:

| Ürün Adı (Veritabanı) | Eski Alış Fiyatı | Yeni Alış Fiyatı (PDF) | Fark |
|---|---|---|---|\n`;

for (const item of changedItems) {
    let diff = (item.newPrice - item.oldPrice).toFixed(2);
    let diffStr = (diff > 0) ? `+€${diff} (Artış)` : `€${diff} (Düşüş)`;
    md += `| ${item.dbName} | €${item.oldPrice} | **€${item.newPrice}** | ${diffStr} |\n`;
}

fs.writeFileSync('degisen_fiyatlar.md', md, 'utf-8');
console.log("Markdown created.");
