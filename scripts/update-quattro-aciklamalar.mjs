import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAciklamalar() {
  const productId = 'a46effd1-1eba-4cda-8699-5d03a2f15675'; // ID for Fo Powder Drink Base (Quatro)

  const updateData = {
    aciklamalar: {
      tr: "Fo Toz İçecek Bazı (Quatro) 1 kg\nMilkshake, frappe, smoothie ve frozen yapımında istenilen kıvamı sağlamak için özel olarak formüle edilmiştir.\n\nKullanım Şekli\n- 300 ml bardak için; 20g toz karışım\n- 400 ml bardak için; 30g toz karışım\n- 500 ml bardak için; 40g toz karışım\nkullanılması tavsiye edilir.\n\nSaklama Koşulları\nDoğrudan güneş ışığından uzak tutunuz. Serin ve kuru yerde saklayınız.",
      en: "Fo Powder Drink Base (Quatro) 1 kg\nIt is specially formulated to provide the desired consistency in milkshake, frappe, smoothie and frozen preparations.\n\nInstructions for Use\n- For 300 ml glass: 20g powder mixture\n- For 400 ml glass: 30g powder mixture\n- For 500 ml glass: 40g powder mixture\n\nStorage Conditions\nKeep away from direct sunlight. Keep in a cool and dry place.",
      de: "Fo Pulvergetränk Basis (Quatro) 1 kg\nEs wurde speziell formuliert, um die gewünschte Konsistenz bei der Herstellung von Milchshakes, Frappes, Smoothies und Frozen zu erzielen.\n\nGebrauchsanweisung\n- Für 300 ml Glas: 20g Pulvermischung\n- Für 400 ml Glas: 30g Pulvermischung\n- Für 500 ml Glas: 40g Pulvermischung\n\nLagerbedingungen\nVor direkter Sonneneinstrahlung schützen. Kühl und trocken lagern."
    }
  };

  const { error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId);

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful for Quattro aciklamalar.');
  }
}

updateAciklamalar();
