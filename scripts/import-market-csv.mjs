// Import Market CSV into Supabase `urunler`
// Usage: node scripts/import-market-csv.mjs [--dry]
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Load environment from .env.local if present (Next.js style)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

// Arg helpers
function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

const DRY_RUN = process.argv.includes('--dry');
const supabase = createClient(url, serviceRoleKey);

// CLI: --file path, --categoryTr "..." --categoryDe "..." --categoryEn "..."
const inputFile = getArg('--file') || 'market.csv';
const CSV_PATH = path.resolve(process.cwd(), inputFile);
const categoryTrArg = getArg('--categoryTr');
const categoryDeArg = getArg('--categoryDe');
const categoryEnArg = getArg('--categoryEn');

function normalizeKey(key) {
  return String(key || '')
    .normalize('NFKD')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function turkishMoneyToNumber(val) {
  if (val == null) return null;
  const s = String(val).trim().replace(/\u00A0/g, '');
  if (!s) return null;
  // Remove quotes, replace decimal comma with dot, strip thousands (not present here)
  const cleaned = s.replace(/"/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function findCategoryIdForGroup(groupTitle) {
  // Map known group to existing product category names
  const candidates = [];
  const title = (groupTitle || '').toLowerCase();
  if (title.includes('pasta')) {
    candidates.push(
      { col: 'tr', txt: 'Pastalar & Kekler' },
      { col: 'de', txt: 'Torten & Kuchen' },
      { col: 'en', txt: 'Cakes & Tarts' },
    );
  }
  // Fallback: generic desserts category
  candidates.push(
    { col: 'tr', txt: 'Pastalar & Kekler' },
    { col: 'de', txt: 'Torten & Kuchen' },
    { col: 'en', txt: 'Cakes & Tarts' },
  );

  for (const c of candidates) {
    const expr = `ad->>'${c.col}'`;
    const { data, error } = await supabase
      .from('kategoriler')
      .select('id, ad')
      .ilike(expr, c.txt);
    if (error) {
      console.warn('⚠️ kategori arama hatası:', error.message);
      continue;
    }
    if (data && data.length > 0) return data[0].id;
  }
  return null; // We'll ask user if null
}

function slugifyCategory(text) {
  const map = { 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u' };
  return String(text || '')
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

// Cache for category lookups to avoid repeated DB queries
const categoryCache = new Map();

async function ensureDefaultCategory({ tr, de, en }) {
  // Check cache first
  const cacheKey = `${en}|${de}|${tr}`;
  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey);
  }

  // Search by exact match first (case-insensitive but not fuzzy)
  const variants = [
    { col: 'en', txt: en },
    { col: 'de', txt: de },
    { col: 'tr', txt: tr },
  ];
  
  for (const v of variants) {
    if (!v.txt) continue;
    // Use eq with case normalization instead of ilike to avoid partial matches
    const { data } = await supabase
      .from('kategoriler')
      .select('id')
      .ilike(`ad->>'${v.col}'`, v.txt)
      .limit(1);
    if (data && data.length) {
      categoryCache.set(cacheKey, data[0].id);
      return data[0].id;
    }
  }
  
  // If not found, create new category
  const ad = { tr, de, en };
  const slug = slugifyCategory(en || de || tr);
  const { data: ins, error } = await supabase
    .from('kategoriler')
    .insert({ ad, slug })
    .select('id')
    .single();
  if (error) {
    console.error('❌ Varsayılan kategori oluşturulamadı:', error.message);
    return null;
  }
  const newId = ins?.id || null;
  if (newId) {
    categoryCache.set(cacheKey, newId);
  }
  return newId;
}

async function findUnitIdByName(names = ['Kutu', 'Box']) {
  // Try to find a matching unit (birimler)
  for (const name of names) {
    for (const col of ['tr', 'de', 'en']) {
      const expr = `ad->>'${col}'`;
      const { data, error } = await supabase
        .from('birimler')
        .select('id, ad')
        .ilike(expr, name);
      if (!error && data && data.length > 0) return data[0].id;
    }
  }
  return null;
}

async function getExistingByStockCode(stokKodu) {
  if (!stokKodu) return null;
  const { data, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu')
    .eq('stok_kodu', stokKodu)
    .maybeSingle();
  if (error) {
    console.warn('⚠️ stok kodu sorgu hatası:', stokKodu, error.message);
    return null;
  }
  return data || null;
}

// Tedarikçi ID'sini bul veya oluştur
async function ensureSupplier() {
  const supplierName = 'Sweet Heaven';
  const { data, error } = await supabase
    .from('tedarikciler')
    .select('id')
    .ilike('unvan', supplierName)
    .limit(1);
  
  if (error) {
    console.warn('⚠️ Tedarikçi arama hatası:', error.message);
    return null;
  }
  
  if (data && data.length > 0) return data[0].id;
  
  // Oluştur
  const { data: ins, error: insErr } = await supabase
    .from('tedarikciler')
    .insert({ unvan: supplierName })
    .select('id')
    .single();
  
  if (insErr) {
    console.error('❌ Tedarikçi oluşturulamadı:', insErr.message);
    return null;
  }
  
  return ins?.id || null;
}

// Kategori tahmini (ürün adına göre)
function detectCategoryKeywords(productName) {
  const lower = productName.toLowerCase();
  
  // Kahve & İçecekler
  if (lower.match(/kahve|coffee|espresso|filtre|türk kahvesi|frappe|çay|tea|latte|cappuccino|salep|sıcak çikolata|şurup|syrup|meyve püresi|limonata|portakal suyu/)) {
    return { tr: 'Kahve & İçecekler', de: 'Kaffee & Getränke', en: 'Coffee & Drinks' };
  }
  
  // Pastalar & Kekler
  if (lower.match(/pasta|cake|kek|browni|brownie|cheesecake|tiramisu|mozaik|profiterol|red velvet|latte|kubbe|bardak|kup|cup|muffin|cookie|kurabiye|sufle/)) {
    return { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' };
  }
  
  // Pizza & Fast Food
  if (lower.match(/pizza|margarita|vejeteryan/)) {
    return { tr: 'Pizza & Fast Food', de: 'Pizza & Fast Food', en: 'Pizza & Fast Food' };
  }
  
  // Soslar & Malzemeler
  if (lower.match(/sos|sauce|waffle sos|lokum/)) {
    return { tr: 'Soslar & Malzemeler', de: 'Saucen & Zutaten', en: 'Sauces & Ingredients' };
  }
  
  // Aksesuarlar
  if (lower.match(/fanus|menü|pompa|servis|altolas/)) {
    return { tr: 'Aksesuarlar', de: 'Zubehör', en: 'Accessories' };
  }
  
  // Varsayılan
  return { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' };
}

// URL slug oluştur
function generateSlug(text, stockCode) {
  const turkishMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  
  let slug = text
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
  
  // Stok koduyla benzersiz yap
  if (stockCode) {
    slug = `${slug}-${stockCode.toLowerCase()}`;
  }
  
  return slug;
}

// Basit çeviri (ürün adı için)
function translateProductName(nameTr) {
  const lower = nameTr.toLowerCase();
  let de = nameTr;
  let en = nameTr;
  let ar = nameTr;
  
  // Temel kelime çevirileri
  const translations = {
    'pasta': { de: 'Torte', en: 'Cake', ar: 'كعكة' },
    'kek': { de: 'Kuchen', en: 'Cake', ar: 'كعكة' },
    'çikolatalı': { de: 'Schokolade', en: 'Chocolate', ar: 'شوكولاتة' },
    'frambuazlı': { de: 'Himbeer', en: 'Raspberry', ar: 'توت العليق' },
    'çilekli': { de: 'Erdbeer', en: 'Strawberry', ar: 'فراولة' },
    'vişneli': { de: 'Kirsch', en: 'Cherry', ar: 'كرز' },
    'limonlu': { de: 'Zitronen', en: 'Lemon', ar: 'ليمون' },
    'kahve': { de: 'Kaffee', en: 'Coffee', ar: 'قهوة' },
    'çay': { de: 'Tee', en: 'Tea', ar: 'شاي' },
    'tiramisu': { de: 'Tiramisu', en: 'Tiramisu', ar: 'تيراميسو' },
    'browni': { de: 'Brownie', en: 'Brownie', ar: 'براوني' },
    'cheesecake': { de: 'Käsekuchen', en: 'Cheesecake', ar: 'تشيز كيك' },
    'kurabiye': { de: 'Kekse', en: 'Cookie', ar: 'بسكويت' },
    'muffin': { de: 'Muffin', en: 'Muffin', ar: 'مافن' },
    'glutensiz': { de: 'Glutenfrei', en: 'Gluten-free', ar: 'خالي من الغلوتين' },
    'dilim': { de: 'Stück', en: 'Slice', ar: 'قطعة' },
    'adet': { de: 'Stück', en: 'Pieces', ar: 'قطع' },
    'orman meyveli': { de: 'Waldbeeren', en: 'Forest Fruits', ar: 'فواكه الغابة' },
    'havuçlu': { de: 'Karotten', en: 'Carrot', ar: 'جزر' },
    'fındıklı': { de: 'Haselnuss', en: 'Hazelnut', ar: 'بندق' },
    'karamelli': { de: 'Karamell', en: 'Caramel', ar: 'كراميل' },
    'vanilya': { de: 'Vanille', en: 'Vanilla', ar: 'فانيليا' },
    'muz': { de: 'Banane', en: 'Banana', ar: 'موز' },
    'elma': { de: 'Apfel', en: 'Apple', ar: 'تفاح' },
    'şeftali': { de: 'Pfirsich', en: 'Peach', ar: 'خوخ' },
    'mango': { de: 'Mango', en: 'Mango', ar: 'مانجو' },
    'nar': { de: 'Granatapfel', en: 'Pomegranate', ar: 'رمان' },
    'türk kahvesi': { de: 'Türkischer Kaffee', en: 'Turkish Coffee', ar: 'قهوة تركية' },
    'filtre kahve': { de: 'Filterkaffee', en: 'Filter Coffee', ar: 'قهوة مفلترة' },
    'sıcak çikolata': { de: 'Heiße Schokolade', en: 'Hot Chocolate', ar: 'شوكولاتة ساخنة' },
    'salep': { de: 'Salep', en: 'Salep', ar: 'سحلب' },
    'şurup': { de: 'Sirup', en: 'Syrup', ar: 'شراب' },
    'çekirdek': { de: 'Bohnen', en: 'Beans', ar: 'حبوب' },
    'pizza': { de: 'Pizza', en: 'Pizza', ar: 'بيتزا' },
    'poşet': { de: 'Beutel', en: 'Pouch', ar: 'كيس' },
    'kavanoz': { de: 'Glas', en: 'Jar', ar: 'جرة' },
  };
  
  // Basit kelime değiştirme (tam eşleşme ve kelime bazlı)
  let deTemp = nameTr;
  let enTemp = nameTr;
  let arTemp = nameTr;
  
  Object.keys(translations).forEach(tr => {
    const regex = new RegExp(`\\b${tr}\\b`, 'gi');
    deTemp = deTemp.replace(regex, translations[tr].de);
    enTemp = enTemp.replace(regex, translations[tr].en);
    arTemp = arTemp.replace(regex, translations[tr].ar);
  });
  
  return {
    tr: nameTr.trim(),
    de: deTemp.trim(),
    en: enTemp.trim(),
    ar: arTemp.trim()
  };
}

function buildAdJson(nameTr) {
  return translateProductName(nameTr);
}

function buildTeknik(gramajKutu, gramajDilim, adetKutuIci, adetKoliIci, adetPaletIci) {
  const t = {};
  if (gramajKutu != null && gramajKutu !== '') t.kutu_gramaj = Number(String(gramajKutu).replace(/\D/g, '')) || null;
  if (gramajDilim != null && gramajDilim !== '') t.dilim_gramaj = Number(String(gramajDilim).replace(/\D/g, '')) || null;
  if (adetKutuIci != null && adetKutuIci !== '') t.kutu_ici_adet = Number(String(adetKutuIci).replace(/\D/g, '')) || null;
  if (adetKoliIci != null && adetKoliIci !== '') t.koli_ici_adet = Number(String(adetKoliIci).replace(/\D/g, '')) || null;
  if (adetPaletIci != null && adetPaletIci !== '') t.palet_ici_adet = Number(String(adetPaletIci).replace(/\D/g, '')) || null;
  return t;
}

async function main() {
  const csvRaw = await fs.readFile(CSV_PATH, 'utf8');

  // Pre-trim stray BOM/empty rows
  const parsed = parse(csvRaw, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
  });

  // Find header row index (line containing 'Ürün Kodu'...)
  let headerIdx = parsed.findIndex(row => row.some(cell => String(cell).toLowerCase().includes('ürün kodu')));
  if (headerIdx === -1) throw new Error('Başlık satırı bulunamadı (Ürün Kodu)');

  const headerRow = parsed[headerIdx];
  const keyIdx = Object.fromEntries(headerRow.map((h, i) => [normalizeKey(h), i]));

  const idxKod = keyIdx[normalizeKey('Ürün Kodu')];
  const idxAd = keyIdx[normalizeKey('Ürün Adı')];
  const idxKutuGramaj = keyIdx[normalizeKey('Kutu Gramaj')];
  const idxDilimGramaj = keyIdx[normalizeKey('Dilim Gramaj')];
  const idxListeKutu = keyIdx[normalizeKey('Liste Fiyatı(Kutu)')] ?? keyIdx[normalizeKey('Liste Fiyatı')];
  const idxListeDilim = keyIdx[normalizeKey('Liste Fiyatı(Dilim)')];
  const idxDistrDilim = keyIdx[normalizeKey('Distribütör Fiyatı (Dilim)')];
  const idxDistrKutu = keyIdx[normalizeKey('Distribütör Fiyatı   (Kutu)')]
    ?? keyIdx[normalizeKey('Distribütör Fiyatı (Kutu)')];
  const idxDistrAlis = keyIdx[normalizeKey('Distribütör Alış Fiyatı')];
  const idxIskonto = keyIdx[normalizeKey('İskonto')];
  const idxKutuIci = keyIdx[normalizeKey('Kutu İçi')] ?? keyIdx[normalizeKey('Kutu İçi Adet')];
  const idxKoliIci = keyIdx[normalizeKey('Koli İçi')] ?? keyIdx[normalizeKey('Koli İçi Adet')];
  const idxPaletIci = keyIdx[normalizeKey('Palet İçi Adet')] ?? keyIdx[normalizeKey('Palet içi Adet')];

  // Kahve-specific optional columns
  const idxAmbalaj = keyIdx[normalizeKey('Ambalaj')];
  const idxMiktar = keyIdx[normalizeKey('Miktar')];
  const idxKoliFiyati = keyIdx[normalizeKey('Koli Fiyatı')];

  const unitId = await findUnitIdByName(['Kutu', 'Box']);
  const supplierId = await ensureSupplier();

  let currentGroup = null;
  let inserted = 0, updated = 0, skipped = 0;

  // Resolve a default category up-front
  const lowerFile = inputFile.toLowerCase();
  const defaultNames = categoryTrArg && categoryDeArg && categoryEnArg
    ? { tr: categoryTrArg, de: categoryDeArg, en: categoryEnArg }
    : lowerFile.includes('kahve')
      ? { tr: 'Kahve & İçecekler', de: 'Kaffee & Getränke', en: 'Coffee & Drinks' }
      : { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' };
  let defaultKategoriId = await ensureDefaultCategory(defaultNames);

  for (let i = headerIdx + 1; i < parsed.length; i++) {
    const row = parsed[i];

    // Category/group line: only first cell has text (e.g., "Otel Pastaları")
    const nonEmptyCount = row.filter((c) => String(c || '').trim().length > 0).length;
    const isGroupRow = nonEmptyCount === 1 && String(row[0] || '').trim().length > 0;
    if (isGroupRow) {
      currentGroup = String(row[0]).trim();
      continue;
    }

    const kod = row[idxKod] ? String(row[idxKod]).trim() : '';
    const adTr = row[idxAd] ? String(row[idxAd]).trim() : '';
    if (!kod || !adTr) { skipped++; continue; }

    const fiyatListeKutu = idxListeKutu != null ? turkishMoneyToNumber(row[idxListeKutu]) : null;
    const fiyatDistrKutu = idxDistrKutu != null ? turkishMoneyToNumber(row[idxDistrKutu]) : null;
    const fiyatDistrAlis = idxDistrAlis != null ? turkishMoneyToNumber(row[idxDistrAlis]) : null;

    // Kategori tahmini
    const detectedCategory = detectCategoryKeywords(adTr);
    let kategoriId = await ensureDefaultCategory(detectedCategory);
    
    // Grup bazlı kategori varsa öncelik ver
    if (currentGroup) {
      const maybe = await findCategoryIdForGroup(currentGroup);
      if (maybe) kategoriId = maybe;
    }

    if (!kategoriId) {
      kategoriId = defaultKategoriId;
    }

    const teknik = buildTeknik(row[idxKutuGramaj], row[idxDilimGramaj], row[idxKutuIci], row[idxKoliIci], row[idxPaletIci]);
    if (idxAmbalaj != null && row[idxAmbalaj]) teknik.ambalaj = String(row[idxAmbalaj]).trim();
    if (idxMiktar != null && row[idxMiktar]) teknik.miktar = String(row[idxMiktar]).trim();
    if (idxKoliFiyati != null && row[idxKoliFiyati] != null) teknik.koli_fiyati = turkishMoneyToNumber(row[idxKoliFiyati]);

    // 4 dilde ürün adı
    const productNames = buildAdJson(adTr);
    
    // Slug oluştur
    const slug = generateSlug(adTr, kod);

    const payload = {
      stok_kodu: kod,
      ad: productNames,
      slug: slug,
      kategori_id: kategoriId,
      tedarikci_id: supplierId ?? undefined,
      satis_fiyati_musteri: fiyatListeKutu ?? undefined,
      satis_fiyati_alt_bayi: fiyatDistrKutu ?? undefined,
      distributor_alis_fiyati: fiyatDistrAlis ?? undefined,
      ana_satis_birimi_id: unitId ?? undefined,
      stok_miktari: 0,
      stok_esigi: 10,
      aktif: true,
      teknik_ozellikler: Object.keys(teknik).length ? teknik : null,
    };

    const exists = await getExistingByStockCode(kod);
    if (DRY_RUN) {
      console.log(exists ? '🟡 Update' : '🟢 Insert', kod, '-', adTr, `[${detectedCategory.tr}]`);
      continue;
    }

    if (exists) {
      const { error } = await supabase.from('urunler').update(payload).eq('id', exists.id);
      if (error) {
        console.error('❌ Güncelleme hatası:', kod, error.message);
        skipped++;
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from('urunler').insert(payload);
      if (error) {
        console.error('❌ Ekleme hatası:', kod, error.message);
        skipped++;
      } else {
        inserted++;
      }
    }
  }

  console.log(`\n✅ Tamamlandı. Eklendi: ${inserted}, Güncellendi: ${updated}, Atlandı: ${skipped}`);
}

main().catch((e) => {
  console.error('❌ Hata:', e);
  process.exit(1);
});
