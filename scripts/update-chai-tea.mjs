import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateChaiTea() {
  const productId = 'fee7b294-3320-41ec-9e3f-23298bbb8903'; // ID for Chai Tea Latte 1kg

  const updateData = {
    inhaltsstoffe: {
      tr: "Şeker, Yağsız Süt Tozu, Peynir Altı Suyu Tozu (Süt ürünü), Siyah Çay Ekstraktı (%4), Tarçın, Doğala Özdeş Chai Aroması, Zencefil, Karanfil, Kakule, Karabiber, Topaklanmayı Önleyici (Silikon Dioksit E551).",
      de: "Zucker, Magermilchpulver, Süßmolkenpulver (Milch), Schwarztee-Extrakt (4%), Zimt, natürliches Chai-Aroma, Ingwer, Nelke, Kardamom, schwarzer Pfeffer, Trennmittel (Siliciumdioxid E551).",
      en: "Sugar, Skimmed milk powder, Whey powder (Milk), Black tea extract (4%), Cinnamon, Nature identical Chai flavor, Ginger, Clove, Cardamom, Black pepper, Anti-caking agent (Silicon dioxide E551)."
    },
    naehrwerte: {
      pro_100g: {
        energie_kj: 1640,
        energie_kcal: 392,
        fett: 0.2,
        davon_gesaettigt: 0.1,
        kohlenhydrate: 95.5,
        davon_zucker: 46.1,
        ballaststoffe: 0.8,
        eiweiss: 1.2,
        salz: 0.09
      }
    },
    allergene: {
      milch: true,
      allergen_free: false,
      contains_tr: "Süt ürünleri içerir.",
      contains_de: "Enthält Milchprodukte.",
      contains_en: "Contains dairy products."
    },
    produktdatenblatt_url: "https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-etiketleri/toz-1kg/FO-CHAI-TEA-AROMALI-ICECEK-TOZU-1KG-C.pdf"
  };

  console.log('Updating Chai Tea Latte...');
  
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful! Data:', JSON.stringify(data[0].ad, null, 2));
    console.log('Updated fields:', Object.keys(updateData).join(', '));
  }
}

updateChaiTea();
