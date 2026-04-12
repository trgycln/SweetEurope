import path from 'node:path';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing Supabase env variables');
  process.exit(1);
}

const supabase = createClient(url, key);
const inputFile = path.resolve(process.cwd(), 'YeniListe.xlsx');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeHeader(value) {
  return normalizeText(value);
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
    normalized = normalized.replace(',', '.');
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toInt(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const normalized = rows[i].map(c => normalizeHeader(c));
    const hasCode = normalized.some(v => v.includes('urunkodu') || v.includes('stokkodu') || v === 'kod');
    const hasName = normalized.some(v => v.includes('urunadi') || v.includes('urunad') || v.includes('name') || v === 'urun');
    const hasPrice = normalized.some(v => v === 'eur' || v.includes('fiyat'));
    if (hasCode && hasName && hasPrice) return i;
  }
  return -1;
}

function findColIndexes(headerRow) {
  const keys = headerRow.map(c => normalizeHeader(c));
  const find = (...needles) => {
    for (let i = 0; i < keys.length; i++) {
      if (needles.some(n => keys[i].includes(n))) return i;
    }
    return null;
  };

  return {
    code: find('urunkodu', 'stokkodu', 'productcode', 'sku', 'kod'),
    name: find('urunadi', 'urunad', 'productname', 'name'),
    eur: find('eur', 'fiyat', 'alisfiyati'),
    koli: find('koliici', 'koliiciadet', 'boxespercase'),
    kutu: find('kutuici', 'kutuiciadet', 'unitsperbox'),
  };
}

function parseWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const byCode = new Map();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerRowIdx = findHeaderRow(rows);
    if (headerRowIdx < 0) continue;

    const idx = findColIndexes(rows[headerRowIdx]);
    if (idx.code == null || idx.name == null || idx.eur == null) continue;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const code = String(row[idx.code] || '').trim();
      const name = String(row[idx.name] || '').trim();

      // Section/category lines inside sheet
      if (!code || !name) continue;

      const price = toNumber(row[idx.eur]);
      if (price == null) continue;

      byCode.set(normalizeText(code), {
        stockCode: code,
        name,
        price: Number(price.toFixed(2)),
        koli: idx.koli != null ? toInt(row[idx.koli]) : null,
        kutu: idx.kutu != null ? toInt(row[idx.kutu]) : null,
        sheetName,
      });
    }
  }

  return byCode;
}

function isUnnamedOrCodeOnly(ad, stockCode) {
  if (!stockCode) return false;
  if (!ad) return true;
  if (typeof ad === 'string') return normalizeText(ad) === normalizeText(stockCode);
  if (typeof ad === 'object') {
    const vals = [ad.tr, ad.de, ad.en, ad.ar].filter(v => v != null && String(v).trim() !== '');
    if (!vals.length) return true;
    return vals.every(v => normalizeText(v) === normalizeText(stockCode));
  }
  return true;
}

async function main() {
  const excelByCode = parseWorkbook(inputFile);
  console.log('Excel ürün map sayısı:', excelByCode.size);

  const { data: products, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad, distributor_alis_fiyati, kutu_ici_adet, koli_ici_kutu_adet');

  if (error || !products) {
    console.error('Ürünler alınamadı:', error?.message || 'unknown');
    process.exit(1);
  }

  const targets = products.filter(p => isUnnamedOrCodeOnly(p.ad, p.stok_kodu));
  console.log('Adı eksik/kod olan ürün sayısı:', targets.length);

  let updated = 0;
  let noExcelMatch = 0;
  const notFoundCodes = [];

  for (const p of targets) {
    const key = normalizeText(p.stok_kodu || '');
    const excel = excelByCode.get(key);
    if (!excel) {
      noExcelMatch += 1;
      notFoundCodes.push(p.stok_kodu);
      continue;
    }

    const patch = {
      ad: {
        tr: excel.name,
        de: excel.name,
        en: excel.name,
      },
      distributor_alis_fiyati: excel.price,
      koli_ici_kutu_adet: excel.koli ?? p.koli_ici_kutu_adet ?? null,
      kutu_ici_adet: excel.kutu ?? p.kutu_ici_adet ?? null,
    };

    const { error: upErr } = await supabase
      .from('urunler')
      .update(patch)
      .eq('id', p.id);

    if (upErr) {
      console.error('Güncelleme hatası', p.stok_kodu, upErr.message);
      continue;
    }

    updated += 1;
    console.log(`✓ ${p.stok_kodu} → ${excel.name} (${excel.sheetName})`);
  }

  console.log('\n--- ÖZET ---');
  console.log('Güncellenen:', updated);
  console.log('Excel eşleşmesi olmayan:', noExcelMatch);
  if (notFoundCodes.length) {
    console.log('Eşleşmeyen stok kodları:', notFoundCodes);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
