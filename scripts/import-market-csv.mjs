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

const DRY_RUN = process.argv.includes('--dry');
const supabase = createClient(url, serviceRoleKey);

const CSV_PATH = path.resolve(process.cwd(), 'market.csv');

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

async function ensureDefaultCategory() {
  const variants = [
    { col: 'tr', txt: 'Pastalar & Kekler' },
    { col: 'de', txt: 'Torten & Kuchen' },
    { col: 'en', txt: 'Cakes & Tarts' },
  ];
  // Try find by any variant
  for (const v of variants) {
    const expr = `ad->>'${v.col}'`;
    const { data } = await supabase
      .from('kategoriler')
      .select('id')
      .ilike(expr, v.txt)
      .limit(1);
    if (data && data.length) return data[0].id;
  }
  // Create if not found
  const ad = { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' };
  const { data: ins, error } = await supabase
    .from('kategoriler')
    .insert({ ad })
    .select('id')
    .single();
  if (error) {
    console.error('❌ Varsayılan kategori oluşturulamadı:', error.message);
    return null;
  }
  return ins?.id || null;
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

function buildAdJson(nameTr) {
  const nm = String(nameTr || '').trim();
  return { tr: nm, de: nm, en: nm };
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
  const idxListeKutu = keyIdx[normalizeKey('Liste Fiyatı(Kutu)')];
  const idxListeDilim = keyIdx[normalizeKey('Liste Fiyatı(Dilim)')];
  const idxDistrDilim = keyIdx[normalizeKey('Distribütör Fiyatı (Dilim)')];
  const idxDistrKutu = keyIdx[normalizeKey('Distribütör Fiyatı   (Kutu)')]
    ?? keyIdx[normalizeKey('Distribütör Fiyatı (Kutu)')];
  const idxIskonto = keyIdx[normalizeKey('İskonto')];
  const idxKutuIci = keyIdx[normalizeKey('Kutu İçi')];
  const idxKoliIci = keyIdx[normalizeKey('Koli İçi')];
  const idxPaletIci = keyIdx[normalizeKey('Palet İçi Adet')];

  const unitId = await findUnitIdByName(['Kutu', 'Box']);

  let currentGroup = null;
  let inserted = 0, updated = 0, skipped = 0;

  // Resolve a default category up-front (Pastalar & Kekler)
  let defaultKategoriId = await ensureDefaultCategory();

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

    const fiyatListeKutu = turkishMoneyToNumber(row[idxListeKutu]);
    const fiyatDistrKutu = turkishMoneyToNumber(row[idxDistrKutu]);

    // Derive category id from group or fallback
    let kategoriId = defaultKategoriId;
    if (currentGroup) {
      const maybe = await findCategoryIdForGroup(currentGroup);
      if (maybe) kategoriId = maybe;
    }

    if (!kategoriId) {
      // Fallback strictly to default
      kategoriId = defaultKategoriId;
    }

    const teknik = buildTeknik(row[idxKutuGramaj], row[idxDilimGramaj], row[idxKutuIci], row[idxKoliIci], row[idxPaletIci]);

    const payload = {
      stok_kodu: kod,
      ad: buildAdJson(adTr),
      kategori_id: kategoriId,
      satis_fiyati_musteri: fiyatListeKutu ?? undefined,
      satis_fiyati_alt_bayi: fiyatDistrKutu ?? undefined,
      ana_satis_birimi_id: unitId ?? undefined,
      stok_miktari: 0,
      stok_esigi: 5,
      aktif: true,
      teknik_ozellikler: Object.keys(teknik).length ? teknik : null,
    };

    const exists = await getExistingByStockCode(kod);
    if (DRY_RUN) {
      console.log(exists ? '🟡 Update' : '🟢 Insert', kod, '-', adTr);
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
