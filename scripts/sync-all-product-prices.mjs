import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function r2(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function roundToStep(v, step) {
  if (!step || step <= 0) return r2(v);
  return r2(Math.round(v / step) * step);
}

const FROZEN_MAIN_SLUGS = new Set(['cakes-and-tarts', 'cookies-and-muffins', 'pizza-and-fast-food']);

function inferProductLineFromCategoryId(categories, categoryId) {
  if (!categoryId) return null;
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  let cur = categoryMap.get(categoryId);
  let guard = 0;
  while (cur && guard++ < 10) {
    if (cur.slug && FROZEN_MAIN_SLUGS.has(cur.slug)) return 'frozen-desserts';
    if (!cur.ust_kategori_id) break;
    cur = categoryMap.get(cur.ust_kategori_id);
  }
  return 'barista-bakery-essentials';
}

async function syncAllPrices() {
  console.log('🔄 Fetching system settings...');
  const { data: settingsData, error: sErr } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value');

  if (sErr) {
    console.error('Error fetching settings:', sErr);
    process.exit(1);
  }

  const settings = {};
  settingsData.forEach(s => {
    const n = parseFloat(s.setting_value);
    if (!isNaN(n)) settings[s.setting_key] = n;
  });

  const shipFrozen = settings.pricing_shipping_frozen_per_box ?? 2;
  const shipDry = settings.pricing_shipping_non_cold_per_box ?? 0.45;
  const custFrozen = settings.pricing_customs_frozen_percent ?? 15;
  const custDry = settings.pricing_customs_non_cold_percent ?? 9;
  const opPct = settings.pricing_operational_percent ?? 20;
  const vatRate = settings.pricing_vat_rate ?? 7;
  const altBayiMargin = settings.pricing_alt_bayi_margin ?? settings.pricing_tier1_margin_percent ?? 1;
  const koliBazliMargin = settings.pricing_koli_bazli_margin ?? settings.pricing_tier3_margin_percent ?? 30;
  const cokKoliMargin = settings.pricing_cok_koli_margin ?? settings.pricing_tier2_margin_percent ?? 20;
  const paletMargin = settings.pricing_palet_margin ?? 10;
  const roundStep = settings.pricing_round_step ?? 0;

  console.log('📊 Active Pricing Parameters:', {
    shipDry, shipFrozen, custDry, custFrozen, opPct,
    altBayiMargin, koliBazliMargin, cokKoliMargin, paletMargin, vatRate, roundStep
  });

  console.log('🔄 Fetching categories...');
  const { data: categories } = await supabase.from('kategoriler').select('id, ad, slug, ust_kategori_id, urun_gami');

  console.log('🔄 Fetching products...');
  const { data: products, error: pErr } = await supabase
    .from('urunler')
    .select('id, ad, kategori_id, distributor_alis_fiyati, urun_gami, teknik_ozellikler, gumruk_vergi_orani_yuzde, almanya_kdv_orani');

  if (pErr) {
    console.error('Error fetching products:', pErr);
    process.exit(1);
  }

  const eligibleProducts = products.filter(p => Number(p.distributor_alis_fiyati) > 0);
  console.log(`Found ${products.length} total products, ${eligibleProducts.length} with purchase price > 0.`);

  let updatedCount = 0;
  const batchSize = 50;

  for (let i = 0; i < eligibleProducts.length; i += batchSize) {
    const batch = eligibleProducts.slice(i, i + batchSize);

    await Promise.all(batch.map(async (product) => {
      const purchase = Number(product.distributor_alis_fiyati);

      const rawLine = Array.isArray(product.urun_gami) ? product.urun_gami[0] : product.urun_gami;
      const storedLine = (rawLine === 'frozen-desserts' || rawLine === 'barista-bakery-essentials')
        ? rawLine
        : inferProductLineFromCategoryId(categories || [], product.kategori_id);
      const isCold = storedLine === 'frozen-desserts';

      const shipping = isCold ? shipFrozen : shipDry;
      const customsPct = Number(product.gumruk_vergi_orani_yuzde ?? (isCold ? custFrozen : custDry));

      const beforeCustoms = purchase + shipping;
      const afterCustoms = beforeCustoms * (1 + customsPct / 100);
      const landedCost = r2(afterCustoms * (1 + opPct / 100));

      const altBayiNet = roundToStep(landedCost * (1 + altBayiMargin / 100), roundStep);
      const paletNet = roundToStep(landedCost * (1 + paletMargin / 100), roundStep);
      const cokKoliNet = roundToStep(landedCost * (1 + cokKoliMargin / 100), roundStep);
      const koliBazliNet = roundToStep(landedCost * (1 + koliBazliMargin / 100), roundStep);

      const existingTek = product.teknik_ozellikler && typeof product.teknik_ozellikler === 'object'
        ? product.teknik_ozellikler
        : {};

      const updatedTek = {
        ...existingTek,
        satis_fiyati_palet: paletNet,
      };

      const updateData = {
        standart_inis_maliyeti_net: landedCost,
        satis_fiyati_alt_bayi: altBayiNet,
        satis_fiyati_palet: paletNet,
        satis_fiyati_toptanci: cokKoliNet,
        satis_fiyati_musteri: koliBazliNet,
        teknik_ozellikler: updatedTek,
      };

      const { error: uErr } = await supabase
        .from('urunler')
        .update(updateData)
        .eq('id', product.id);

      if (uErr) {
        console.error(`Failed to update product ${product.id}:`, uErr.message);
      } else {
        updatedCount++;
        if (updatedCount <= 5 || updatedCount % 50 === 0) {
          const name = product.ad?.tr || product.ad?.de || product.ad?.en || product.id;
          console.log(`[${updatedCount}/${eligibleProducts.length}] ${name}: Alış=${purchase}€ => Net=${landedCost}€ | AltBayi=${altBayiNet}€ | Palet=${paletNet}€ | 5Koli=${cokKoliNet}€ | 1Koli=${koliBazliNet}€`);
        }
      }
    }));
  }

  console.log(`\n🎉 SUCCESS: ${updatedCount} products updated successfully!`);
}

syncAllPrices().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
