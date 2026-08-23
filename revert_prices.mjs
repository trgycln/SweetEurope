import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceRoleKey);

async function revert() {
    const log = JSON.parse(fs.readFileSync('update_log.json', 'utf8'));
    
    const { data: dbProducts, error } = await supabase
        .from('urunler')
        .select('id, ad, distributor_alis_fiyati');

    if (error) {
        console.error('Error fetching products:', error.message);
        return;
    }

    let revertedCount = 0;

    for (const item of log) {
        if (item.oldPrice === item.newPrice) continue; // No change made

        // Find the DB product
        let matchedDb = dbProducts.find(db => {
            const adName = typeof db.ad === 'object' ? (db.ad.tr || db.ad.en) : db.ad;
            return adName === item.dbName;
        });

        if (matchedDb) {
            // Revert the price
            const { error: updateErr } = await supabase
                .from('urunler')
                .update({ distributor_alis_fiyati: item.oldPrice })
                .eq('id', matchedDb.id);
            
            if (!updateErr) {
                console.log(`Reverted "${item.dbName}" back to ${item.oldPrice}`);
                revertedCount++;
            } else {
                console.error(`Failed to revert ${item.dbName}:`, updateErr);
            }
        } else {
            console.error(`Could not find product in DB to revert: ${item.dbName}`);
        }
    }

    console.log(`Successfully reverted ${revertedCount} products.`);
}

revert().catch(console.error);
