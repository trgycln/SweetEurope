import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMatchaAciklamalar() {
  const productId = 'd65ba9af-cd9a-48f0-823d-781c917bd259';

  const updateData = {
    aciklamalar: {
      tr: "Matcha Yeşil Çay İçecek Tozu\nÖzenle seçilmiş matcha yeşil çay yapraklarından elde edilen, kafelerde ve evde profesyonel lezzetler yaratmanız için ideal içecek tozu.\n\nKullanım Şekli ve Hazırlanışı (350 ml bardak için)\n- 40-60 gr (1 tepeleme yemek kaşığı 20 gr) matcha yeşil çay içecek tozu\n- 200 ml pastörize / sterilize soğuk süt\n- 10 adet küp buz (200 ml suya eşit)\nTüm malzemeler blendera konulur. Buzlar kırılıncaya kadar karıştırılır. Daha sonra bardakta servis yapılır.\n\nSaklama Koşulları\nDoğrudan güneş ışığından uzak tutunuz. Serin ve kuru yerde saklayınız.",
      en: "Matcha Green Tea Powder Drink\nIdeal drink powder obtained from carefully selected matcha green tea leaves for you to create professional tastes in cafes and at home.\n\nPreparation (for a 350 ml cup)\n- 40-60 g (1 full tablespoon = 20 g) matcha green tea drinking powder\n- 200 ml pasteurized/sterilized cold milk\n- 10 ice cubes (equivalent to 200 ml of water)\nAdd all ingredients to a blender and blend until the ice is crushed. Then, serve in a glass.\n\nStorage Conditions\nKeep away from direct sunlight. Keep in a cool and dry place.",
      de: "Matcha Grüner Tee Pulver Getränk\nIdeales Getränkepulver aus sorgfältig ausgewählten Matcha-Grünteeblättern für die Zubereitung professioneller Köstlichkeiten in Cafés und zu Hause.\n\nZubereitung (für ein 350 ml Glas)\n- 40-60 g (1 gehäufter Esslöffel entspricht 20 g) Matcha-grüner Tee Pulvermischung\n- 200 ml pasteurisierte/sterilisierte kalte Milch\n- 10 Eiswürfel (entsprechen 200 ml Wasser)\nAlle Zutaten in den Mixer geben. Solange mixen, bis die Eiswürfel zerkleinert sind. Danach in einem Glas servieren.\n\nLagerbedingungen\nVor direkter Sonneneinstrahlung schützen. Kühl und trocken lagern."
    }
  };

  const { error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId);

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update successful for Matcha aciklamalar.');
  }
}

updateMatchaAciklamalar();
