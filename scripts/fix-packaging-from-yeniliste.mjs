// Fix koli_ici_kutu_adet (and dilim_adedi/kutu_ici_adet) for all products in YeniListe.xlsx
// Usage: node scripts/fix-packaging-from-yeniliste.mjs [--dry]
import path from 'node:path';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY = process.argv.includes('--dry');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Helpers ──────────────────────────────────────────────────────────────────
function norm(v) {
  // Replace Turkish special chars before stripping to get consistent keys
  return String(v ?? '')
    .replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
}
function toInt(v) {
  const n = Number(String(v ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}
function toNum(v) {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Parse each sheet ──────────────────────────────────────────────────────────
function parseSheet(wb, sheetName) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  const results = [];

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map(c => norm(c));
    const hasCode = r.some(c => c.includes('urunkodu') || c.includes('stokkodu') || c === 'kod');
    const hasName = r.some(c => c.includes('urunadi') || c.includes('ad'));
    if (hasCode || hasName) { headerIdx = i; break; }
  }
  if (headerIdx < 0) return results;

  const header = rows[headerIdx].map(c => norm(c));

  // Column detection
  const find = (...needles) => {
    for (let i = 0; i < header.length; i++) {
      if (needles.some(n => header[i].includes(n))) return i;
    }
    return null;
  };

  const colCode   = find('urunkodu', 'stokkodu', 'kod');
  const colName   = find('urunadi', 'adi');
  const colKutuIci = find('kutuici', 'kutuiciadet', 'dilimici', 'kutuicisayisi'); // Kutu İçi / dilim sayısı
  const colKoliIci = find('koliici', 'koliiciadet', 'koliicikutu');               // Koli İçi
  const colGramaj  = find('kutugramaj', 'gramaj', 'agirlik');                      // Kutu Gramaj (g)
  const colDilimGramaj = find('dilimgramaj');
  const colEur    = find('eur', 'fiyat', 'alisfiyati');

  if (colCode === null && colName === null) return results;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const code = String(row[colCode] ?? '').trim();
    const name = colName !== null ? String(row[colName] ?? '').trim() : '';

    // Skip section-header / empty rows — need at least a stok kodu
    if (!code) continue;
    // Valid product codes start with letters+digits (e.g. MM10000)
    if (!/^[A-Za-z0-9]/.test(code)) continue;

    const kutuIci  = colKutuIci  !== null ? toInt(row[colKutuIci])  : null;
    const koliIci  = colKoliIci  !== null ? toInt(row[colKoliIci])  : null;

    // Sanity check: skip rows that look like catalog/menu items (kutu or koli > 100)
    if ((kutuIci && kutuIci > 100) || (koliIci && koliIci > 100)) continue;
    const gramajKg = colGramaj   !== null ? (() => {
      const g = toNum(row[colGramaj]);
      return g && g > 10 ? +(g / 1000).toFixed(3) : g; // convert g → kg
    })() : null;
    const eur = colEur !== null ? toNum(row[colEur]) : null;

    results.push({ code, name, kutuIci, koliIci, gramajKg, eur });
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const wb = XLSX.readFile(path.resolve(process.cwd(), 'YeniListe.xlsx'), { cellDates: false });

// Gather all rows from all sheets, keyed by stok_kodu
const byCode = new Map();
for (const sheetName of wb.SheetNames) {
  for (const row of parseSheet(wb, sheetName)) {
    if (row.code && !byCode.has(row.code)) {
      byCode.set(row.code, row);
    }
  }
}

console.log(`Excel: ${byCode.size} unique product codes found`);

// Fetch all products with their current packaging
const { data: products, error } = await supabase
  .from('urunler')
  .select('id, stok_kodu, ad, koli_ici_kutu_adet, birim_agirlik_kg, teknik_ozellikler')
  .range(0, 6000);

if (error) { console.error('DB fetch error:', error.message); process.exit(1); }

let updated = 0, skipped = 0, notFound = 0;

for (const product of products) {
  const code = String(product.stok_kodu ?? '').trim();
  const excel = byCode.get(code);

  if (!excel) { notFound++; continue; }

  const specs = { ...(typeof product.teknik_ozellikler === 'object' && product.teknik_ozellikler ? product.teknik_ozellikler : {}) };
  const dbUpdate = {};

  // koli_ici_kutu_adet — direct DB column + teknik_ozellikler JSON
  if (excel.koliIci !== null) {
    if (product.koli_ici_kutu_adet !== excel.koliIci) {
      dbUpdate.koli_ici_kutu_adet = excel.koliIci;
    }
    specs.koli_ici_kutu_adet = excel.koliIci;
  }

  // kutu_ici_adet (how many slices/units per box) — only in teknik_ozellikler
  if (excel.kutuIci !== null) {
    specs.kutu_ici_adet = excel.kutuIci;
    specs.dilim_adedi   = excel.kutuIci;
  }

  // birim_agirlik_kg — direct DB column
  if (excel.gramajKg !== null) {
    if (product.birim_agirlik_kg !== excel.gramajKg) {
      dbUpdate.birim_agirlik_kg = excel.gramajKg;
    }
    specs.net_agirlik_gram = Math.round(excel.gramajKg * 1000);
  }

  // Always sync teknik_ozellikler
  dbUpdate.teknik_ozellikler = specs;

  if (Object.keys(dbUpdate).length === 1 && dbUpdate.teknik_ozellikler) {
    // Only specs changed — check if anything actually changed
    const oldSpecs = product.teknik_ozellikler || {};
    const changed = Object.keys(specs).some(k => String(specs[k]) !== String(oldSpecs[k]));
    if (!changed) { skipped++; continue; }
  }

  const adTr = product.ad?.tr || product.ad?.de || code;
  console.log(`${DRY ? '[DRY]' : '[UPD]'} ${code} | ${adTr.slice(0, 40).padEnd(40)} | kutu: ${excel.kutuIci ?? '—'} | koli: ${excel.koliIci ?? '—'} | ${excel.gramajKg ? excel.gramajKg + ' kg' : '—'}`);

  if (!DRY) {
    const { error: upErr } = await supabase.from('urunler').update(dbUpdate).eq('id', product.id);
    if (upErr) { console.error(`  ✗ ${code}: ${upErr.message}`); continue; }
  }
  updated++;
}

console.log('\n─── Summary ───');
console.log(`Updated : ${updated}`);
console.log(`Skipped : ${skipped} (no change)`);
console.log(`No match: ${notFound} (not in Excel)`);
