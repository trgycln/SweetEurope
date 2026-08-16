import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: allProducts, error } = await supabase
    .from('urunler')
    .select('id, ad, aktif, stok_kodu, ean_gtin, inhaltsstoffe, naehrwerte, allergene, produktdatenblatt_url, besin_degerleri')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }
  
  const activeProducts = allProducts.filter(p => p.aktif);
  console.log('Total products in DB:', allProducts.length);
  console.log('Active products in DB:', activeProducts.length);

  let missingNutrition = 0;
  let missingIngredients = 0;
  let missingAllergens = 0;
  let missingPdf = 0;

  activeProducts.forEach((p, idx) => {
    const name = p.ad?.de || p.ad?.tr || p.ad?.en || 'Unknown';
    const hasNut = (p.naehrwerte && Object.keys(p.naehrwerte).length > 0) || (p.besin_degerleri && Object.keys(p.besin_degerleri).length > 0);
    const hasIng = p.inhaltsstoffe && Object.keys(p.inhaltsstoffe).length > 0 && (p.inhaltsstoffe.de || p.inhaltsstoffe.tr);
    const hasAll = p.allergene && Object.keys(p.allergene).length > 0;
    const hasPdf = !!p.produktdatenblatt_url;

    if (!hasNut) missingNutrition++;
    if (!hasIng) missingIngredients++;
    if (!hasAll) missingAllergens++;
    if (!hasPdf) missingPdf++;

    console.log(`[${idx + 1}/${activeProducts.length}] ${name} | Nut: ${hasNut ? '✅' : '❌'} | Ing: ${hasIng ? '✅' : '❌'} | All: ${hasAll ? '✅' : '❌'} | PDF: ${hasPdf ? '✅' : '❌'}`);
  });

  console.log('\n--- SUMMARY FOR ACTIVE PRODUCTS (' + activeProducts.length + ') ---');
  console.log('Missing Nutrition (naehrwerte):', missingNutrition);
  console.log('Missing Ingredients (inhaltsstoffe):', missingIngredients);
  console.log('Missing Allergens (allergene):', missingAllergens);
  console.log('Missing Product Data Sheet (produktdatenblatt_url):', missingPdf);
}

check();
