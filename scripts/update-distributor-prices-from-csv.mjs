// Update distributor_alis_fiyati for existing products from provided CSV files
// Usage:
//   node scripts/update-distributor-prices-from-csv.mjs            # reads default CSVs in repo root
//   node scripts/update-distributor-prices-from-csv.mjs --files Kahve.csv,Market.csv
//   node scripts/update-distributor-prices-from-csv.mjs --dry      # no DB writes
// Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
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
const filesArg = getArg('--files');
const DEFAULT_FILES = ['Market.csv', 'Kahve.csv', 'Otel.csv', 'pasta.csv'];
const INPUT_FILES = (filesArg ? filesArg.split(',') : DEFAULT_FILES).map(f => path.resolve(process.cwd(), f.trim()))

function normalizeKey(key) {
  return String(key || '')
    .normalize('NFKD')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
    .replace(/["']/g, '')
    .replace(/[()]/g, '')
    .replace(/%/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function turkishMoneyToNumber(val) {
  if (val == null) return null;
  const s = String(val).trim().replace(/\u00A0/g, '');
  if (!s) return null;
  const cleaned = s
    .replace(/"/g, '')
    .replace(/\./g, '') // thousands (guarded)
    .replace(/,/g, '.')
    .replace(/\s/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toInt(val) {
  if (val == null) return null;
  const n = Number(String(val).replace(/\D/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function getExistingByStockCode(stokKodu) {
  if (!stokKodu) return null;
  const { data, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, distributor_alis_fiyati')
    .eq('stok_kodu', stokKodu)
    .maybeSingle();
  if (error) {
    console.warn('⚠️ stok_kodu query error:', stokKodu, error.message);
    return null;
  }
  return data || null;
}

function extractHeaderIndexes(headerRow) {
  const keyIdx = Object.fromEntries(headerRow.map((h, i) => [normalizeKey(h), i]));
  const idx = {
    kod: keyIdx[normalizeKey('Ürün Kodu')] ?? keyIdx[normalizeKey('Urun Kodu')] ?? keyIdx['urunkodu'],
    ad: keyIdx[normalizeKey('Ürün Adı')] ?? keyIdx['urunadı'] ?? keyIdx['urunadi'],
    distrAlis: keyIdx[normalizeKey('Distribütör Alış Fiyatı')],
    distrKutu: keyIdx[normalizeKey('Distribütör Fiyatı   (Kutu)')] ?? keyIdx[normalizeKey('Distribütör Fiyatı (Kutu)')],
    distrDilim: keyIdx[normalizeKey('Distribütör Fiyatı (Dilim)')],
    kutuIci: keyIdx[normalizeKey('Kutu İçi')] ?? keyIdx[normalizeKey('Kutu İçi Adet')],
  };
  return idx;
}

function deriveDistributorPrice(row, idx) {
  // Priority: explicit Alış price, then Kutu price, then Dilim * Kutu İçi
  const pAlis = idx.distrAlis != null ? turkishMoneyToNumber(row[idx.distrAlis]) : null;
  if (pAlis != null) return pAlis;

  const pKutu = idx.distrKutu != null ? turkishMoneyToNumber(row[idx.distrKutu]) : null;
  if (pKutu != null) return pKutu;

  const pDilim = idx.distrDilim != null ? turkishMoneyToNumber(row[idx.distrDilim]) : null;
  const adet = idx.kutuIci != null ? toInt(row[idx.kutuIci]) : null;
  if (pDilim != null && adet != null) {
    const calc = Number((pDilim * adet).toFixed(4));
    return calc;
  }
  return null;
}

async function parseFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const parsed = parse(content, { bom: true, relaxColumnCount: true, skipEmptyLines: true });
  // find header with 'Ürün Kodu'
  let headerIdx = parsed.findIndex(row => row.some(cell => String(cell).toLowerCase().includes('ürün kodu')));
  if (headerIdx === -1) headerIdx = parsed.findIndex(row => row.some(cell => normalizeKey(cell).includes('urunkodu')));
  if (headerIdx === -1) {
    console.warn(`⚠️ Header not found in ${path.basename(filePath)} — skipping`);
    return new Map();
  }

  const header = parsed[headerIdx];
  const idx = extractHeaderIndexes(header);
  if (idx.kod == null) {
    console.warn(`⚠️ 'Ürün Kodu' column not found in ${path.basename(filePath)} — skipping`);
    return new Map();
  }

  const map = new Map();
  for (let i = headerIdx + 1; i < parsed.length; i++) {
    const row = parsed[i];
    // group separators will have empty kod
    const kodRaw = row[idx.kod];
    const stokKodu = String(kodRaw || '').trim();
    if (!stokKodu || stokKodu.startsWith('#') || stokKodu.length < 3) continue;

    const price = deriveDistributorPrice(row, idx);
    if (price == null) continue;

    map.set(stokKodu, price);
  }
  return map;
}

async function main() {
  console.log('ℹ️ Updating distributor_alis_fiyati from CSVs...');
  console.log('   Files:', INPUT_FILES.map(f => path.basename(f)).join(', '));

  // Aggregate prices from all files (later files override earlier on duplicates)
  const aggregated = new Map();
  for (const file of INPUT_FILES) {
    try {
      const map = await parseFile(file);
      for (const [kod, price] of map.entries()) {
        aggregated.set(kod, price);
      }
      console.log(`   ✔ Parsed ${path.basename(file)}: ${map.size} items with price`);
    } catch (e) {
      console.warn(`   ⚠️ Failed to parse ${path.basename(file)}:`, e.message);
    }
  }

  console.log(`ℹ️ Total unique stock codes with price: ${aggregated.size}`);

  let updated = 0, missing = 0, notFound = 0, unchanged = 0;

  for (const [kod, price] of aggregated.entries()) {
    const existing = await getExistingByStockCode(kod);
    if (!existing) { notFound++; continue; }

    // Skip if unchanged
    if (existing.distributor_alis_fiyati != null && Number(existing.distributor_alis_fiyati) === price) {
      unchanged++; continue;
    }

    if (DRY_RUN) { updated++; continue; }

    const { error } = await supabase
      .from('urunler')
      .update({ distributor_alis_fiyati: price })
      .eq('id', existing.id);
    if (error) {
      console.warn('⚠️ Update failed for', kod, error.message);
      missing++; // count as missing/failure
    } else {
      updated++;
    }
  }

  console.log('— Summary —');
  console.log('  Updated:', updated);
  console.log('  Unchanged:', unchanged);
  console.log('  Not found in DB:', notFound);
  console.log('  Failed:', missing);
  if (DRY_RUN) console.log('  (dry run: no writes performed)');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
