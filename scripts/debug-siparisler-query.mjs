import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    // 1. Find Gözde Cafe firma
    const { data: firmalar, error: fErr } = await supabase
        .from('firmalar')
        .select('id, unvan')
        .ilike('unvan', '%Gözde%');

    console.log('Firmalar:', firmalar, fErr);
    if (!firmalar || firmalar.length === 0) return;
    const firmaId = firmalar[0].id;

    // 2. Simple select from siparisler
    const { data: simpleOrders, error: sErr } = await supabase
        .from('siparisler')
        .select('*')
        .eq('firma_id', firmaId);

    console.log('\nSimple orders count:', simpleOrders?.length, sErr);
    console.log('Orders:', simpleOrders);

    // 3. Complex select with relations as in portal/siparisler/page.tsx
    const { data: complexOrders, error: cErr } = await supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            toplam_tutar_net,
            toplam_tutar_brut,
            kdv_orani,
            siparis_durumu,
            teslimat_adresi,
            siparis_detay (
                id,
                urun_id,
                miktar,
                birim_fiyat,
                toplam_fiyat,
                urunler (
                    id,
                    ad,
                    stok_kodu,
                    ana_resim_url,
                    satis_fiyati_musteri,
                    stok_miktari,
                    koli_ici_adet
                )
            )
        `)
        .eq('firma_id', firmaId);

    console.log('\nComplex orders result:');
    console.log('Error:', cErr);
    console.log('Data:', JSON.stringify(complexOrders, null, 2));
}

checkOrders();
