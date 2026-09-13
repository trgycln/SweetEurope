const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\r\n]+)"?/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzePricing() {
    const { data: products } = await supabase
        .from('urunler')
        .select('*')
        .eq('aktif', true);

    const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
    let belowCostCount = 0;
    const belowCostList = [];

    products.forEach(p => {
        const purchase = Number(p.distributor_alis_fiyati || 0);
        if (purchase <= 0) return;
        const isCold = p.lojistik_sinifi === 'cold-chain';
        const shipping = isCold ? (350 / 384) : 0.45;
        const customs = isCold ? 0.15 : 0.09;
        const op = 0.20;
        const beforeCustoms = purchase + shipping;
        const afterCustoms = beforeCustoms * (1 + customs);
        const landedCost = r2(afterCustoms * (1 + op));

        const dbMusteri = Number(p.satis_fiyati_musteri || 0);
        const dbToptanci = Number(p.satis_fiyati_toptanci || 0);
        const dbPalet = Number(p.satis_fiyati_palet || 0);
        const dbAltBayi = Number(p.satis_fiyati_alt_bayi || 0);

        if (dbMusteri < dbToptanci || dbToptanci < dbPalet || dbPalet < dbAltBayi) {
            belowCostCount++;
            belowCostList.push({
                name: p.ad?.tr || p.slug,
                musteri: dbMusteri,
                toptanci: dbToptanci,
                palet: dbPalet,
                altBayi: dbAltBayi
            });
        }
    });

    console.log(`Total active products checked: ${products.length}`);
    console.log(`Invalid hierarchy count (musteri >= toptanci >= palet >= alt_bayi): ${belowCostCount}`);
    if (belowCostCount > 0) {
        console.log('Invalid hierarchy items:', belowCostList);
    } else {
        console.log('✅ All products satisfy: musteri (1 Koli) >= toptanci (5 Koli) >= palet (Palet) >= alt_bayi (Alt Bayi)');
    }
}

analyzePricing();
