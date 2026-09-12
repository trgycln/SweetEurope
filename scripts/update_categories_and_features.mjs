import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const VALID_CATEGORIES = [
  { id: '5e4a728a-65d7-483b-9cb4-f8c37cb0af60', path: 'HoReCa > Soslar > Meyveli Sos (Frozen)' },
  { id: '90320294-fb9e-4a88-8ebb-b46f3717799f', path: 'HoReCa > Soslar > Dekor Soslar' },
  { id: '5ed5cbf0-baa0-4e4d-a452-94dd68e0e386', path: 'HoReCa > Soslar > Profesyonel Barsos' },
  { id: '73573007-1d9a-4574-921a-09fd1e610ad5', path: 'HoReCa > Kokteyl Şurupları > Aromalı Kokteyl Şurupları' },
  { id: '7d66168b-5530-4e3b-8371-6a643def69bb', path: 'HoReCa > Kokteyl Şurupları > Kokteyl Karışımları' },
  { id: 'c50e6bb6-aa30-49be-ae8c-dae65608c68a', path: 'HoReCa > Toz İçecekler > Aromalı İçecek Tozları (Milkshake - Smoothie)' },
  { id: '318833bd-eb95-448d-91f5-b748a28d1556', path: 'HoReCa > Toz İçecekler > Aromalı İçecek Bazı' },
  { id: '71804c62-f21f-412b-b82f-749e495391bf', path: 'Premium > Premium Şuruplar' },
  { id: '21f65289-fb51-4a03-a33d-7f4c6d9d9135', path: 'Premium > Premium Bar Sosları' },
  { id: '3e20c73f-89cb-4fff-a03c-e289043e2b9c', path: 'Premium > Özel Soslar' },
  { id: 'd6de0def-3bff-418d-a4c9-8c2c30c9a232', path: 'HoReCa > Köpürtücü (Foamer)' }
];

const FLAVORS = [
  'vanille', 'mango', 'erdbeere', 'schoko', 'weiße schokolade', 'karamell', 
  'haselnuss', 'irish cream', 'minze', 'pfefferminze', 'spearmint', 
  'blue curacao', 'grenadine', 'pfirsich', 'kokos', 'wassermelone', 
  'grüner apfel', 'brombeere', 'kiwi', 'ananas', 'taro', 'melone', 
  'popping candy', 'hibiskus', 'sorrel', 'banane', 'pistazie', 'waldbeere'
];

function extractGeschmack(nameDE, nameEN) {
  const n = (nameDE + ' ' + nameEN).toLowerCase();
  if (n.includes('weiße schoko') || n.includes('white chocolate')) return 'weiße schokolade';
  if (n.includes('schoko') || n.includes('chocolate')) return 'schoko';
  if (n.includes('vanill')) return 'vanille';
  if (n.includes('erdbeer') || n.includes('strawberry')) return 'erdbeere';
  if (n.includes('mango')) return 'mango';
  if (n.includes('karamell') || n.includes('caramel') || n.includes('toffee')) return 'karamell';
  if (n.includes('haselnuss') || n.includes('hazelnut')) return 'haselnuss';
  if (n.includes('irish')) return 'irish cream';
  if (n.includes('pfefferminz') || n.includes('peppermint')) return 'pfefferminze';
  if (n.includes('spearmint')) return 'spearmint';
  if (n.includes('minz') || n.includes('mint')) return 'minze';
  if (n.includes('blue curacao')) return 'blue curacao';
  if (n.includes('grenadine')) return 'grenadine';
  if (n.includes('pfirsich') || n.includes('peach')) return 'pfirsich';
  if (n.includes('kokos') || n.includes('coconut')) return 'kokos';
  if (n.includes('wassermelone') || n.includes('watermelon')) return 'wassermelone';
  if (n.includes('apfel') || n.includes('apple')) return 'grüner apfel';
  if (n.includes('brombeer') || n.includes('blackberry')) return 'brombeere';
  if (n.includes('kiwi')) return 'kiwi';
  if (n.includes('ananas') || n.includes('pine apple') || n.includes('pineapple')) return 'ananas';
  if (n.includes('taro')) return 'taro';
  if (n.includes('melon')) return 'melone';
  if (n.includes('popping')) return 'popping candy';
  if (n.includes('hibiskus') || n.includes('hibiscus')) return 'hibiskus';
  if (n.includes('sorrel')) return 'sorrel';
  if (n.includes('banan')) return 'banane';
  if (n.includes('pistaz') || n.includes('pistachio')) return 'pistazie';
  if (n.includes('waldbeer') || n.includes('wild berries')) return 'waldbeere';
  return null;
}

function determineCategoryId(item, url) {
  const n = (item.proforma_name || '').toLowerCase();
  const u = (url || '').toLowerCase();
  
  if (n.includes('foamer')) return 'd6de0def-3bff-418d-a4c9-8c2c30c9a232'; // Köpürtücü
  if (n.includes('drink mix') || n.includes('apollo') || n.includes('dionysus') || n.includes('helios') || n.includes('zeus') || n.includes('heracles') || n.includes('mint and lime flavored beverage')) return '7d66168b-5530-4e3b-8371-6a643def69bb'; // Kokteyl Karışımları
  if (n.includes('powder') || u.includes('toz')) return 'c50e6bb6-aa30-49be-ae8c-dae65608c68a'; // İçecek Tozları
  if (n.includes('base') || u.includes('baz')) return '318833bd-eb95-448d-91f5-b748a28d1556'; // İçecek Bazı
  if (n.includes('pistachio verde')) return '3e20c73f-89cb-4fff-a03c-e289043e2b9c'; // Özel Soslar
  
  if (n.includes('sauce') || u.includes('sos')) {
      if (n.includes('premium')) return '21f65289-fb51-4a03-a33d-7f4c6d9d9135'; // Premium Bar Sosları
      if (n.includes('fruited') || n.includes('fruit sauce') || u.includes('frozen')) return '5e4a728a-65d7-483b-9cb4-f8c37cb0af60'; // Meyveli Sos (Frozen)
      if (n.includes('750 gr') || n.includes('750g') || n.includes('eclipse') || n.includes('popping')) return '90320294-fb9e-4a88-8ebb-b46f3717799f'; // Dekor Soslar
      return '5ed5cbf0-baa0-4e4d-a452-94dd68e0e386'; // Profesyonel Barsos
  }
  
  if (n.includes('syrup') || u.includes('surup')) {
      if (n.includes('premium')) return '71804c62-f21f-412b-b82f-749e495391bf'; // Premium Şuruplar
      return '73573007-1d9a-4574-921a-09fd1e610ad5'; // Aromalı Kokteyl Şurupları
  }
  
  return '73573007-1d9a-4574-921a-09fd1e610ad5'; // Fallback
}

async function processProductsLocally() {
  const productsDir = path.join(process.cwd(), 'data', 'canonical_products');
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));
  
  console.log(`Starting deterministic DB update for ${files.length} products...`);
  let processed = 0;
  
  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const barcode = data.barkod;
    
    if (!barcode) continue;

    const { data: existing, error: dbErr } = await supabase
      .from('urunler')
      .select('id, teknik_ozellikler')
      .eq('ean_gtin', barcode)
      .single();
      
    if (dbErr || !existing) continue;

    // Get ingredients string to determine vegan/glutenfrei
    const ingredients = (data.icindekiler?.de || data.icindekiler?.en || '').toLowerCase();
    const isVegan = !ingredients.includes('milch') && !ingredients.includes('milk') && !ingredients.includes('ei') && !ingredients.includes('egg') && !ingredients.includes('gelatine');
    const isLaktosefrei = !ingredients.includes('milch') && !ingredients.includes('milk') && !ingredients.includes('molke') && !ingredients.includes('whey');
    const isGlutenfrei = !ingredients.includes('weizen') && !ingredients.includes('wheat') && !ingredients.includes('mehl') && !ingredients.includes('flour') && !ingredients.includes('gersten') && !ingredients.includes('barley');
    const nameStr = (data.urun_adi?.de || data.urun_adi?.en || '').toLowerCase();
    const isOhneZucker = nameStr.includes('zuckerfrei') || nameStr.includes('sugar free') || nameStr.includes('ohne zucker') || nameStr.includes('sekersiz');

    const geschmack = extractGeschmack(data.urun_adi?.de, data.urun_adi?.en);
    const categoryId = determineCategoryId({proforma_name: data.urun_adi?.en}, existing.teknik_ozellikler?.fostore_url);
    
    const updatedTeknikOzellikler = {
      ...(existing.teknik_ozellikler || {}),
      geschmack: geschmack,
      vegan: isVegan,
      ohne_zucker: isOhneZucker,
      glutenfrei: isGlutenfrei,
      laktosefrei: isLaktosefrei,
      halal: true // Typically FO products are halal cert
    };
    
    const { error: updateErr } = await supabase
      .from('urunler')
      .update({
        kategori_id: categoryId,
        teknik_ozellikler: updatedTeknikOzellikler,
        urun_gami: [] 
      })
      .eq('id', existing.id);
      
    if (updateErr) {
      console.error(`Error updating ${barcode}:`, updateErr.message);
    } else {
      processed++;
      const catName = VALID_CATEGORIES.find(c => c.id === categoryId)?.path;
      console.log(`[${processed}/${files.length}] Updated ${barcode} -> Cat: ${catName}, Aroma: ${geschmack}, Vegan: ${isVegan}`);
    }
  }
  
  console.log('Update complete. Now deleting legacy categories...');
  await deleteLegacyCategories();
}

async function deleteLegacyCategories() {
  const legacyCategories = [
    'c027925c-2358-4f42-9f84-4e7c27042ca3', // Meyveli Soslar 1 kg
    '72fa1a80-65bf-4a7b-8f0d-ef4e20a90623', // Premium Şuruplar 700 ml
    '1970014c-7bdf-4a9a-99b1-d9441c0553bb', // Kokteyl Şurupları 700 ml
    '3e216221-8697-4187-9e50-9d78fc3c9d77', // Toz İçecekler (Eski)
    '7d12bf74-e599-4449-a262-5371cbb89fba', // Silvery Şuruplar
    '5b8f1b1f-7762-45ac-852c-bbe1d6668a05', // Ice Tea
    'a8b5f8e5-5ec7-409d-a25d-1147b6189c12', // Pasta & Aroma Pastaları
    'fb37ff76-2d56-4c09-9bdb-ce0c3851fe22', // Dekor Topping Sosları 750 g
    '0afba57c-6ad1-4586-a357-ec1c2c138911', // Dondurma Topping Sosları 1 kg
    'bea4328c-d35b-469d-9459-55ffd4045d77'  // Özel Soslar 940 g
  ];

  for (const id of legacyCategories) {
    const { error } = await supabase.from('kategoriler').delete().eq('id', id);
    if (error) {
       console.log(`Could not delete legacy category ${id}:`, error.message);
    } else {
       console.log(`Deleted legacy category ${id}.`);
    }
  }
}

processProductsLocally();
