import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    let page = 0;
    let allData = [];
    while (true) {
        const { data, error } = await supabase
            .from('firmalar')
            .select('id, unvan, etiketler, teknik_ozellikler')
            .not('etiketler', 'is', null)
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !data) break;
        allData.push(...data);
        if (data.length < 1000) break;
        page++;
    }

    console.log(`Found ${allData.length} records with etiketler.`);
    let updatedCount = 0;

    for (const f of allData) {
        if (!Array.isArray(f.etiketler)) continue;
        
        let urunEslesme = '';
        let strateji = '';
        let ipucu = '';
        let newEtiketler = [];
        
        for (const e of f.etiketler) {
            if (e.startsWith('FO_URUN: ')) {
                urunEslesme = e.replace('FO_URUN: ', '').trim();
            } else if (e.startsWith('STRATEJI: ')) {
                strateji = e.replace('STRATEJI: ', '').trim();
            } else if (e.startsWith('IPUCU: ')) {
                ipucu = e.replace('IPUCU: ', '').trim();
            } else {
                newEtiketler.push(e);
            }
        }
        
        if (urunEslesme || strateji || ipucu) {
            let tekOz = f.teknik_ozellikler || {};
            if (strateji) {
                tekOz.satis_stratejisi = tekOz.satis_stratejisi ? tekOz.satis_stratejisi + ' \n\n' + strateji : strateji;
            }
            
            let notlarArr = [];
            if (tekOz.notlar) notlarArr.push(tekOz.notlar);
            if (urunEslesme) notlarArr.push('FO Ürün Eşleşmesi: ' + urunEslesme);
            if (ipucu) notlarArr.push('İpucu: ' + ipucu);
            
            if (notlarArr.length > 0) {
                tekOz.notlar = notlarArr.join('\n\n');
            }
            
            const { error } = await supabase
                .from('firmalar')
                .update({ 
                    etiketler: newEtiketler.length > 0 ? newEtiketler : null,
                    teknik_ozellikler: tekOz
                })
                .eq('id', f.id);
                
            if (!error) updatedCount++;
            else console.error('Error updating', f.id, error);
        }
    }
    console.log(`Migrated etiketler to teknik_ozellikler for ${updatedCount} records.`);
}

run().catch(console.error);
