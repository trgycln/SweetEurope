const fs = require('fs');

const data = JSON.parse(fs.readFileSync('new_specs_en.json', 'utf8'));

for (const item of data) {
  ['de', 'tr', 'ar'].forEach(lang => {
    item.ad[lang] = item.ad.en;
    item.aciklama[lang] = item.aciklama.en;
    item.inhaltsstoffe[lang] = item.inhaltsstoffe.en;
  });
}

fs.writeFileSync('extracted_new_specs.json', JSON.stringify(data, null, 2));
console.log('Duplicated EN to DE, TR, AR for ' + data.length + ' items.');
