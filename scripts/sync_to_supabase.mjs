import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getCategoryId(name) {
  const upper = name.toUpperCase();
  if (upper.includes('MEYVELI SOS') || (upper.includes('FRUIT') && upper.includes('SAUCE'))) {
    return 'c027925c-2358-4f42-9f84-4e7c27042ca3'; // Meyveli Soslar 1 kg
  }
  if (upper.includes('SAUCE') || upper.includes('SOS')) {
    return '3df0be9f-a9c0-47d7-a828-1ec2d34d5b84'; // Soslar / Cafe Bar Sauces
  }
  if (upper.includes('PREMIUM') && (upper.includes('SYRUP') || upper.includes('SURUP'))) {
    return '72fa1a80-65bf-4a7b-8f0d-ef4e20a90623'; // Premium Şuruplar 700 ml
  }
  if (upper.includes('SYRUP') || upper.includes('SURUP')) {
    return '1970014c-7bdf-4a9a-99b1-d9441c0553bb'; // Kokteyl Şurupları 700 ml
  }
  if (upper.includes('FOAMER')) {
    return 'd6de0def-3bff-418d-a4c9-8c2c30c9a232'; // Foamer
  }
  if (upper.includes('POWDER') || upper.includes('QUATRO')) {
    return '3e216221-8697-4187-9e50-9d78fc3c9d77'; // Toz İçecekler
  }
  return '318833bd-eb95-448d-91f5-b748a28d1556'; // Aromalı İçecek Bazı
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function syncCatalog() {
  console.log('🚀 Starting catalog sync to Supabase...');

  const mapped = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));
  const canonicalDir = 'data/canonical_products';
  
  // 1. Fetch all existing products from Supabase
  const { data: existingProducts, error: fetchErr } = await supabase.from('urunler').select('*');
  if (fetchErr) {
    console.error('Failed to fetch existing products:', fetchErr);
    return;
  }
  console.log(`Found ${existingProducts.length} total products currently in Supabase.`);

  // Create lookup by barcode
  const existingByBarcode = new Map();
  for (const p of existingProducts) {
    if (p.ean_gtin) {
      existingByBarcode.set(p.ean_gtin, p);
    }
  }

  const canonicalBarcodes = new Set(mapped.map(m => m.barcode));
  let updatedCount = 0;
  let insertedCount = 0;

  // 2. Process each of the 90 canonical products
  for (const item of mapped) {
    const filePath = `${canonicalDir}/${item.barcode}.json`;
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Warning: ${item.barcode}.json not found yet! Skipping...`);
      continue;
    }

    const verified = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const categoryId = getCategoryId(item.proforma_name);
    const existing = existingByBarcode.get(item.barcode);

    const unitPrice = Number(item.unit_price_eur);
    const koliAdet = Number(item.koli_ici_adet);
    const paletKoli = Number(item.palet_ici_koli);

    const productPayload = {
      ad: verified.urun_adi,
      aciklamalar: verified.aciklamalar,
      stok_kodu: verified.stok_kodu || `SP-FP-${item.barcode}`,
      ean_gtin: item.barcode,
      gtip_kodu: item.gtip,
      taric_kodu: item.gtip,
      kategori_id: categoryId,
      tedarikci_id: '1d650c3f-aede-45e5-9fd9-9a058e9e05ce',
      distributor_alis_fiyati: unitPrice,
      satis_fiyati_musteri: Math.round(unitPrice * 1.5 * 100) / 100,
      satis_fiyati_alt_bayi: Math.round(unitPrice * 1.3 * 100) / 100,
      satis_fiyati_toptanci: Math.round(unitPrice * 1.15 * 100) / 100,
      koli_ici_adet: koliAdet,
      palet_ici_adet: paletKoli * koliAdet,
      inhaltsstoffe: verified.icindekiler,
      allergene: verified.alerjen_bilgisi,
      naehrwerte: verified.naehrwerte,
      besin_degerleri: verified.naehrwerte,
      teknik_ozellikler: {
        kullanim_alanlari: verified.kullanim_alanlari,
        saklama_kosullari: verified.saklama_kosullari,
        alerjen_bilgisi: verified.alerjen_bilgisi,
        raf_omru: verified.raf_omru,
        ambalaj: verified.ambalaj,
        palet_ici_koli: paletKoli,
        koli_ici_adet: koliAdet,
        fostore_url: item.fostore_url,
        spec_file: item.spec?.file
      },
      ana_resim_url: existing?.ana_resim_url || `https://atydffkpyvxcmzxyibhj.supabase.co/storage/v1/object/public/urun-gorselleri/${item.barcode}.jpg`,
      slug: existing?.slug || slugify(verified.urun_adi.de || verified.urun_adi.en || item.proforma_name),
      aktif: true
    };

    if (existing) {
      const { error: updErr } = await supabase
        .from('urunler')
        .update(productPayload)
        .eq('id', existing.id);
      
      if (updErr) {
        console.error(`❌ Failed to update ${item.barcode}:`, updErr.message);
      } else {
        updatedCount++;
      }
    } else {
      const newId = crypto.randomUUID();
      const { error: insErr } = await supabase
        .from('urunler')
        .insert({
          id: newId,
          ...productPayload,
          stok_miktari: 0,
          stok_esigi: 10
        });

      if (insErr) {
        console.error(`❌ Failed to insert ${item.barcode}:`, insErr.message);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`✅ Synchronization results: ${updatedCount} products updated, ${insertedCount} products inserted.`);

  // 3. Deactivate or delete ghost products (products NOT in the 90 canonical barcodes)
  const ghostProducts = existingProducts.filter(p => !p.ean_gtin || !canonicalBarcodes.has(p.ean_gtin));
  console.log(`Found ${ghostProducts.length} ghost products to remove or deactivate.`);

  let deletedCount = 0;
  let deactivatedCount = 0;

  for (const ghost of ghostProducts) {
    // Try to delete first
    const { error: delErr } = await supabase.from('urunler').delete().eq('id', ghost.id);
    if (!delErr) {
      deletedCount++;
    } else {
      // If delete fails due to foreign key (e.g. order history), mark as inactive
      const { error: deactErr } = await supabase
        .from('urunler')
        .update({ aktif: false })
        .eq('id', ghost.id);
      if (!deactErr) deactivatedCount++;
    }
  }

  console.log(`🧹 Ghost cleanup results: ${deletedCount} deleted, ${deactivatedCount} deactivated.`);
  console.log('✨ All operations completed successfully!');
}

syncCatalog();
