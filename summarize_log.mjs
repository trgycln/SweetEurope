import fs from 'fs';

const log = JSON.parse(fs.readFileSync('update_log.json', 'utf8'));

let changed = 0;
let newlyAdded = 0;
let untouched = 0;

for (const item of log) {
    if (item.oldPrice === null || item.oldPrice === 0) {
        newlyAdded++;
    } else if (item.oldPrice !== item.newPrice) {
        changed++;
    } else {
        untouched++;
    }
}

console.log(`Değişen Fiyatlar: ${changed}`);
console.log(`İlk Defa Girilenler: ${newlyAdded}`);
console.log(`Aynı Kalanlar: ${untouched}`);

// Find non-matched DB products
const fiyatRaporu = JSON.parse(fs.readFileSync('fiyat_raporu.json', 'utf8'));
console.log(`Hala Fiyatı Olmayan/Eşleşmeyen DB Ürün Sayısı: ${fiyatRaporu.notFoundInPdf.length}`);
