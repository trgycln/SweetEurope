// Import YeniListe.xlsx: update only distributor_alis_fiyati + koli_ici_kutu_adet for existing products,
// and insert new products with minimal required fields.
// Usage:
//   node scripts/import-yeniliste-xlsx.mjs --file YeniListe.xlsx --dry
//   node scripts/import-yeniliste-xlsx.mjs --file YeniListe.xlsx

import path from 'node:path';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith('--')) return next;
  }
  return null;
}

const DRY_RUN = process.argv.includes('--dry');
const inputFile = path.resolve(process.cwd(), getArg('--file') || 'YeniListe.xlsx');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let normalized = raw.replace(/[€$£₺]/g, '').replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value) {
  const n = Number(String(value ?? '').replace(/[^0-9]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function getNameCandidates(ad) {
  if (!ad) return [];
  if (typeof ad === 'string') return [ad];
  if (typeof ad === 'object') {
    return [ad.tr, ad.de, ad.en, ad.ar].filter(Boolean);
  }
  return [];
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const normalized = rows[i].map(cell => normalizeKey(cell));
    const hasCode = normalized.some(v => v.includes('urunkodu') || v.includes('stockcode') || v === 'kod');
    const hasName = normalized.some(v => v.includes('urunadi') || v.includes('productname') || v === 'urun');
    const hasPrice = normalized.some(v => v === 'eur' || v.includes('alisfiyati') || v.includes('fiyat'));
    if ((hasCode || hasName) && hasPrice) return i;
  }
  return -1;
}

function findColumnIndexes(headerRow) {
  const keys = headerRow.map(cell => normalizeKey(cell));

  const find = (...needles) => {
    for (let i = 0; i < keys.length; i++) {
      if (needles.some(n => keys[i].includes(n))) return i;
    }
    return null;
  };

  return {
    code: find('urunkodu', 'stockcode', 'productcode', 'sku', 'stokkodu'),
    name: find('urunadi', 'productname', 'name', 'urun'),
    eur: find('eur', 'alisfiyati', 'distributoralisfiyati', 'fiyat'),
    koli: find('koliici', 'koliiciadet', 'boxespercase'),
  };
}

function profileBySheet(sheetName) {
  const key = normalizeText(sheetName);
  if (key.includes('kahve')) return 'barista-bakery-essentials';
  return 'frozen-desserts';
}

function calculatePrices(purchase) {
  const p = Number(purchase || 0);
  const alt = Number((p * 1.05).toFixed(2));
  const musteri = Number((p * 1.3).toFixed(2));
  return { alt, musteri };
}

function resolveSheetRows(workbook) {
  const out = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerRowIndex = findHeaderRow(rows);
    if (headerRowIndex < 0) continue;

    const headerRow = rows[headerRowIndex];
    const idx = findColumnIndexes(headerRow);
    if (idx.code == null || idx.name == null || idx.eur == null) continue;

    let section = null;
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const code = String(row[idx.code] || '').trim();
      const name = String(row[idx.name] || '').trim();
      const price = toNumber(row[idx.eur]);
      const koli = idx.koli != null ? toInt(row[idx.koli]) : null;

      if (!code && name && price == null) {
        section = name;
        continue;
      }

      if (!code || !name || price == null) continue;

      out.push({
        sheetName,
        section,
        stockCode: code,
        productName: name,
        price,
        koli,
        urun_gami: profileBySheet(sheetName),
      });
    }
  }

  return out;
}

async function resolveSweetheavenSupplierId() {
  const { data, error } = await supabase
    .from('tedarikciler')
    .select('id, unvan')
    .limit(2000);

  if (error) return null;
  const candidates = data || [];
  const exact = candidates.find(s => normalizeText(s.unvan).includes('sweetheaven'));
  return exact?.id || null;
}

function dominantKey(map) {
  let bestKey = null;
  let bestCount = -1;
  for (const [key, count] of map.entries()) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  return bestKey;
}

function bumpCounter(counterMap, key) {
  if (!key) return;
  counterMap.set(key, (counterMap.get(key) || 0) + 1);
}

async function main() {
  console.log('Import file:', path.basename(inputFile), DRY_RUN ? '(dry run)' : '');

  const workbook = XLSX.readFile(inputFile, { cellDates: false });
  const parsedRows = resolveSheetRows(workbook);

  if (!parsedRows.length) {
    console.error('No importable rows found in workbook.');
    process.exit(1);
  }

  const supplierId = await resolveSweetheavenSupplierId();

  const { data: products, error: productErr } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad, distributor_alis_fiyati, koli_ici_kutu_adet, kategori_id')
    .range(0, 6000);

  if (productErr || !products) {
    console.error('Failed to read products:', productErr?.message || 'unknown');
    process.exit(1);
  }

  const byCode = new Map();
  const byName = new Map();

  for (const p of products) {
    if (p.stok_kodu) byCode.set(normalizeText(p.stok_kodu), p);
    for (const n of getNameCandidates(p.ad)) {
      const key = normalizeText(n);
      if (key && !byName.has(key)) byName.set(key, p);
    }
  }

  const sectionCategoryStats = new Map();
  const sheetCategoryStats = new Map();

  // Pass 1: learn category from matched products
  for (const row of parsedRows) {
    const match = byCode.get(normalizeText(row.stockCode)) || byName.get(normalizeText(row.productName));
    if (!match?.kategori_id) continue;

    const sectionKey = `${row.sheetName}::${normalizeText(row.section || '')}`;
    if (!sectionCategoryStats.has(sectionKey)) sectionCategoryStats.set(sectionKey, new Map());
    bumpCounter(sectionCategoryStats.get(sectionKey), match.kategori_id);

    if (!sheetCategoryStats.has(row.sheetName)) sheetCategoryStats.set(row.sheetName, new Map());
    bumpCounter(sheetCategoryStats.get(row.sheetName), match.kategori_id);
  }

  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  let notFoundCategory = 0;

  const unmatchedRows = [];

  for (const row of parsedRows) {
    const keyCode = normalizeText(row.stockCode);
    const keyName = normalizeText(row.productName);
    const matched = byCode.get(keyCode) || byName.get(keyName) || null;

    if (matched) {
      const updateData = {};
      const currentPrice = Number(matched.distributor_alis_fiyati ?? 0);
      if (Number.isFinite(row.price) && Number(row.price) !== currentPrice) {
        updateData.distributor_alis_fiyati = Number(row.price.toFixed(2));
      }

      if (row.koli != null) {
        const currentKoli = matched.koli_ici_kutu_adet == null ? null : Number(matched.koli_ici_kutu_adet);
        if (currentKoli !== row.koli) {
          updateData.koli_ici_kutu_adet = row.koli;
        }
      }

      if (Object.keys(updateData).length === 0) {
        skipped += 1;
        continue;
      }

      if (!DRY_RUN) {
        const { error } = await supabase.from('urunler').update(updateData).eq('id', matched.id);
        if (error) {
          unmatchedRows.push(`${row.stockCode} (${row.productName}) update error: ${error.message}`);
          continue;
        }
      }

      updated += 1;
      continue;
    }

    const sectionKey = `${row.sheetName}::${normalizeText(row.section || '')}`;
    const sectionTop = dominantKey(sectionCategoryStats.get(sectionKey) || new Map());
    const sheetTop = dominantKey(sheetCategoryStats.get(row.sheetName) || new Map());
    const categoryId = sectionTop || sheetTop || null;

    if (!categoryId) {
      notFoundCategory += 1;
      unmatchedRows.push(`${row.stockCode} (${row.productName}) no category resolved`);
      continue;
    }

    const prices = calculatePrices(row.price);
    const slugBase = slugify(`${row.productName}-${row.stockCode}`) || slugify(row.productName) || row.stockCode.toLowerCase();
    const payload = {
      ad: { tr: row.productName, de: row.productName, en: row.productName },
      slug: slugBase,
      kategori_id: categoryId,
      stok_kodu: row.stockCode,
      distributor_alis_fiyati: Number(row.price.toFixed(2)),
      satis_fiyati_alt_bayi: prices.alt,
      satis_fiyati_musteri: prices.musteri,
      urun_gami: row.urun_gami,
      tedarikci_id: supplierId,
      ...(row.koli != null ? { koli_ici_kutu_adet: row.koli } : {}),
    };

    if (!DRY_RUN) {
      let { error } = await supabase.from('urunler').insert(payload);
      if (error && String(error.message || '').toLowerCase().includes('duplicate key value')) {
        payload.slug = `${slugBase}-${Date.now()}`;
        ({ error } = await supabase.from('urunler').insert(payload));
      }

      if (error) {
        unmatchedRows.push(`${row.stockCode} (${row.productName}) insert error: ${error.message}`);
        continue;
      }
    }

    inserted += 1;
  }

  console.log('--- Summary ---');
  console.log('Parsed rows:', parsedRows.length);
  console.log('Updated existing:', updated);
  console.log('Inserted new:', inserted);
  console.log('Skipped unchanged:', skipped);
  console.log('No category for new:', notFoundCategory);
  console.log('Errors:', unmatchedRows.length);

  if (unmatchedRows.length) {
    console.log('--- Sample issues (max 30) ---');
    for (const line of unmatchedRows.slice(0, 30)) {
      console.log('-', line);
    }
  }

  if (DRY_RUN) {
    console.log('Dry run enabled, no writes were made.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
