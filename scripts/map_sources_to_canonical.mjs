import fs from 'fs';

const proforma = JSON.parse(fs.readFileSync('data/canonical_proforma_90.json', 'utf8'));
const specs = JSON.parse(fs.readFileSync('_archive/parsed_all_specs.json', 'utf8'));
const fostoreUrls = JSON.parse(fs.readFileSync('data/fostore_all_urls.json', 'utf8'));

// Helper to normalize strings for comparison
function norm(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const enToTrDict = {
  'strawberry': 'cilek',
  'wild': 'orman',
  'berries': 'meyvesi',
  'berry': 'meyvesi',
  'mango': 'mango',
  'banana': 'muz',
  'watermelon': 'karpuz',
  'black': 'kara',
  'mulberry': 'dut',
  'apple': 'elma',
  'green': 'yesil',
  'peach': 'seftali',
  'kiwi': 'kivi',
  'lemon': 'limon',
  'melon': 'kavun',
  'blueberry': 'yaban mersini',
  'blackberry': 'bogurtlen',
  'raspberry': 'frambuaz',
  'passion': 'tutku',
  'fruit': 'meyve',
  'fruited': 'meyveli',
  'pine': 'ananas',
  'pineapple': 'ananas',
  'caramel': 'karamel',
  'chocolate': 'cikolata',
  'white': 'beyaz',
  'vanilla': 'vanilya',
  'coconut': 'hindistan cevizi',
  'lime': 'lime',
  'pomegranate': 'nar',
  'hazelnut': 'findik',
  'peppermint': 'nane',
  'mint': 'nane',
  'spearmint': 'bahce nane',
  'hibiscus': 'hibiskus',
  'popping': 'patlayan',
  'candy': 'seker',
  'pistachio': 'fistik',
  'sauce': 'sos',
  'syrup': 'surup',
  'powder': 'toz',
  'drink': 'icecek'
};

function enToTr(str) {
  let res = str.toLowerCase();
  for (const [en, tr] of Object.entries(enToTrDict)) {
    const reg = new RegExp('\\b' + en + '\\b', 'g');
    res = res.replace(reg, tr);
  }
  return res;
}

function tokenize(str) {
  const trStr = enToTr(str);
  return norm(trStr).split(' ').filter(t => t.length > 2 && !['fo', 've', 'ile', 'ml', 'kg', 'cl', 'gr', 'premium'].includes(t));
}

const mapped = proforma.map(item => {
  const pTokens = tokenize(item.proforma_name);

  // Match Spec
  let bestSpec = null;
  let maxSpecScore = 0;

  for (const s of specs) {
    const sTokens = tokenize(s.product_name + ' ' + (s.file || ''));
    const matches = pTokens.filter(t => sTokens.includes(t));
    const score = matches.length / Math.max(pTokens.length, 1);
    if (score > maxSpecScore && matches.length >= 2) {
      maxSpecScore = score;
      bestSpec = s;
    }
  }

  // Match Fostore URL
  let bestUrl = null;
  let maxUrlScore = 0;

  for (const u of fostoreUrls) {
    const slug = u.replace('https://fostore.com/', '');
    const uTokens = tokenize(slug);
    const matches = pTokens.filter(t => uTokens.includes(t));
    const score = matches.length / Math.max(pTokens.length, 1);
    if (score > maxUrlScore && matches.length >= 2) {
      maxUrlScore = score;
      bestUrl = u;
    }
  }

  return {
    barcode: item.barcode,
    proforma_name: item.proforma_name,
    unit_weight: item.unit_weight,
    koli_ici_adet: item.koli_ici_adet,
    palet_ici_koli: item.palet_ici_koli,
    unit_price_eur: item.unit_price_eur,
    gtip: item.gtip,
    spec: bestSpec ? { file: bestSpec.file, product_name: bestSpec.product_name } : null,
    fostore_url: bestUrl
  };
});

const withSpec = mapped.filter(m => m.spec).length;
const withFostore = mapped.filter(m => m.fostore_url).length;

console.log(`Summary of 90 Products:`);
console.log(`- Matched with Spec Doc: ${withSpec} / 90`);
console.log(`- Matched with Fostore URL: ${withFostore} / 90`);

fs.writeFileSync('data/canonical_triangulation_90.json', JSON.stringify(mapped, null, 2), 'utf8');
console.log(`Saved to data/canonical_triangulation_90.json`);
