const fs = require('fs');

const data = JSON.parse(fs.readFileSync('fiyat_raporu.json', 'utf8'));

let md = `# Tedarikçi Fiyat Güncelleme Raporu (PDF İncelemesi)

Aşağıdaki rapor, verdiğiniz 3 PDF dosyasındaki normal (indirimsiz) fiyatların analizini ve mevcut veritabanınızla olan karşılaştırmasını içermektedir.

## 📊 Özet
- **PDF'lerden Çıkarılan Toplam Fiyat Bilgisi:** ${data.summary.totalPdfItems}
- **Tekil Ürün Sayısı (PDF):** ${data.summary.uniquePdfItems}
- **PDF'ler Arası Çakışan Fiyat (Mükerrer):** ${data.summary.conflictingDuplicates}
- **Veritabanındaki Aktif Ürün Sayısı:** ${data.summary.totalActiveDbProducts}

`;

if (data.duplicates && data.duplicates.length > 0) {
    md += `## ⚠️ Dikkat: PDF'ler Arasında Farklı Fiyatı Olan Mükerrer Ürünler\n`;
    md += `Farklı PDF'lerde aynı ürün farklı fiyatlarla yer alıyor. Lütfen hangi fiyatın geçerli olduğunu teyit edin:\n\n`;
    md += `| Ürün Adı (PDF) | Bulunan Fiyatlar | Dosyalar |\n`;
    md += `|---|---|---|\n`;
    for (const dup of data.duplicates) {
        md += `| ${dup.name} | €${dup.prices.join(', €')} | ${dup.sources.join(', ')} |\n`;
    }
    md += `\n`;
}

if (data.changes && data.changes.length > 0) {
    md += `## 🔄 Fiyatı Değişen Ürünler\n`;
    md += `Aşağıdaki ürünlerin veritabanındaki alış fiyatları, PDF'teki normal fiyatlarla eşleşmiyor. Onayınızla bu fiyatlar güncellenecektir:\n\n`;
    md += `| Ürün Adı (DB) | Ürün Adı (PDF) | Eski Fiyat | Yeni Fiyat |\n`;
    md += `|---|---|---|---|\n`;
    for (const change of data.changes) {
        md += `| ${change.dbName} | ${change.pdfName} | €${change.oldPrice} | **€${change.newPrice}** |\n`;
    }
    md += `\n`;
} else {
    md += `## 🔄 Fiyatı Değişen Ürünler\n*Eşleşen ürünler arasında fiyat değişikliği bulunamadı.*\n\n`;
}

if (data.firstTimePrices && data.firstTimePrices.length > 0) {
    md += `## 🆕 İlk Defa Fiyat Girilecek Ürünler\n`;
    md += `Aşağıdaki ürünlerin veritabanında alış fiyatı yoktu, PDF'ten yeni fiyat eklenecek:\n\n`;
    md += `| Ürün Adı (DB) | Ürün Adı (PDF) | Eklenecek Fiyat |\n`;
    md += `|---|---|---|\n`;
    for (const first of data.firstTimePrices) {
        md += `| ${first.dbName} | ${first.pdfName} | **€${first.newPrice}** |\n`;
    }
    md += `\n`;
}

if (data.notFoundInDb && data.notFoundInDb.length > 0) {
    md += `## ❌ Veritabanında Eşleşmeyen PDF Ürünleri\n`;
    md += `> [!WARNING]
> PDF'teki İngilizce/Farklı isimlerle veritabanındaki Türkçe isimler tam eşleşmemiş olabilir. Veya bu ürünler sistemde henüz ekli değildir.\n\n`;
    md += `| Ürün Adı (PDF) | Fiyat |\n`;
    md += `|---|---|\n`;
    for (let i = 0; i < Math.min(data.notFoundInDb.length, 50); i++) {
        const item = data.notFoundInDb[i];
        md += `| ${item.name} | €${item.price} |\n`;
    }
    if (data.notFoundInDb.length > 50) {
        md += `| ... ve ${data.notFoundInDb.length - 50} ürün daha | |\n`;
    }
    md += `\n`;
}

if (data.notFoundInPdf && data.notFoundInPdf.length > 0) {
    md += `## ❓ PDF Listelerinde Fiyatı Olmayan Veritabanı Ürünleri\n`;
    md += `Aşağıdaki ürünler veritabanınızda var, ancak yüklediğiniz PDF listelerinde fiyatları bulunamadı (veya isimleri eşleşmediği için bulunamadı sayıldı):\n\n`;
    md += `| Ürün Adı (DB) | Mevcut Alış Fiyatı |\n`;
    md += `|---|---|\n`;
    for (let i = 0; i < Math.min(data.notFoundInPdf.length, 50); i++) {
        const item = data.notFoundInPdf[i];
        md += `| ${item.name} | €${item.currentPrice || 0} |\n`;
    }
    if (data.notFoundInPdf.length > 50) {
        md += `| ... ve ${data.notFoundInPdf.length - 50} ürün daha | |\n`;
    }
    md += `\n`;
}

fs.writeFileSync('Fiyat_Guncelleme_Raporu.md', md);
console.log("Markdown report created");
