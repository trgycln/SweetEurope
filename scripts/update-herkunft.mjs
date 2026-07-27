import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateHerkunftsland() {
    const herkunftJson = {
        de: "Türkei",
        en: "Turkey",
        tr: "Türkiye",
        ar: "تركيا"
    };
    
    console.log("Updating all products to have herkunftsland =", herkunftJson);
    
    // Perform an update without a WHERE clause to update all rows
    const { data, error } = await supabase
        .from('urunler')
        .update({ herkunftsland: herkunftJson })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition just in case Supabase requires one
        
    if (error) {
        console.error("Error updating products:", error);
    } else {
        console.log("Successfully updated all products.");
    }
}
updateHerkunftsland();
