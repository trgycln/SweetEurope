import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(query, period) {
    console.log(`\n--- Testing Search: "${query}" (Period: ${period || 'all'}) ---`);
    const cleanQuery = (query || '').replace(/^#/, '').toLowerCase().trim();

    let finalMatchingOrderIds = null;
    if (cleanQuery) {
        // 1. Products search
        const { data: matchedUrunler } = await supabase
            .from('urunler')
            .select('id')
            .or(`ad->>tr.ilike.%${cleanQuery}%,ad->>de.ilike.%${cleanQuery}%,ad->>en.ilike.%${cleanQuery}%,stok_kodu.ilike.%${cleanQuery}%`);
        
        let productOrderIds = [];
        if (matchedUrunler && matchedUrunler.length > 0) {
            const urunIds = matchedUrunler.map(u => u.id);
            const { data: matchedDetails } = await supabase
                .from('siparis_detay')
                .select('siparis_id')
                .in('urun_id', urunIds);
            
            if (matchedDetails) {
                productOrderIds = matchedDetails.map(d => d.siparis_id).filter(Boolean);
            }
        }

        // 2. Orders direct search (Fetch firma's orders id & dates to match)
        const { data: firmaOrders } = await supabase
            .from('siparisler')
            .select('id, siparis_tarihi, teslimat_adresi')
            .eq('firma_id', '125e0c33-5951-475a-a18b-e14a9c6efc7d');

        const directOrderIds = (firmaOrders || []).filter(o => {
            const idMatch = o.id.toLowerCase().includes(cleanQuery);
            const dateMatch = o.siparis_tarihi && o.siparis_tarihi.includes(cleanQuery);
            const addrMatch = o.teslimat_adresi && o.teslimat_adresi.toLowerCase().includes(cleanQuery);
            return idMatch || dateMatch || addrMatch;
        }).map(o => o.id);

        finalMatchingOrderIds = Array.from(new Set([...productOrderIds, ...directOrderIds]));
    }

    let q = supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            toplam_tutar_net,
            siparis_durumu,
            siparis_detay (
                id,
                miktar,
                urunler ( ad, stok_kodu )
            )
        `)
        .eq('firma_id', '125e0c33-5951-475a-a18b-e14a9c6efc7d');

    if (finalMatchingOrderIds !== null) {
        if (finalMatchingOrderIds.length === 0) {
            q = q.in('id', ['00000000-0000-0000-0000-000000000000']);
        } else {
            q = q.in('id', finalMatchingOrderIds);
        }
    }

    const { data: results, error } = await q;
    console.log('Results count:', results?.length, 'Error:', error);
    results?.forEach(r => {
        const itemNames = r.siparis_detay?.map(d => d.urunler?.ad?.tr || d.urunler?.ad?.de).join(', ');
        console.log(`- #${r.id.substring(0, 8)} (${r.siparis_tarihi}) | ${itemNames} | ${r.toplam_tutar_net} €`);
    });
}

async function run() {
    await testSearch('frambuaz');
    await testSearch('464b');
    await testSearch('2026-08');
    await testSearch('nonexistent');
}

run();
