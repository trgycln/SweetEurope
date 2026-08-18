import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMelonPowder() {
  const productId = '8be92bb0-f908-4614-b4c2-4deac3a5b66c'; // Melon Flavored Beverage Powder

  const updateData = {
    aciklamalar: {
      tr: "Kavun Aromalı İçecek Tozu 1 kg\nKavun Aromalı İçecek Tozu, içecek tariflerine yoğun, kremamsı ve tatlı bir kavun lezzeti kazandırmak için geliştirilmiştir. Kolay çözünen yapısı sayesinde sıcak ve soğuk uygulamalarda pürüzsüz bir doku oluşturur ve her hazırlamada standart lezzet sunar. Kafe, restoran ve profesyonel mutfak kullanımı için idealdir.\n\nKullanım Alanları\n- Frappe ve smoothie yapımında kullanılır.\n- Milkshake uygulamaları\n- Kafe ve restoran menü içecekleri\n\nKullanım Talimatı\n40 gr Aromalı içecek tozu 200 ml pastörize veya sterilize soğuk süt, 10 adet küp buz (200 ml suya eşittir) blendıra konulur. Buzlar kırılıncaya kadar karıştırılır. Daha sonra bardakta servis yapılır.\n\nSaklama Koşulları\nGüneş ışığından uzakta, serin ve kuru yerde saklayınız.",
      en: "Melon Flavored Beverage Powder 1 kg\nMelon Flavored Beverage Powder was developed to bring an intense, creamy and sweet melon flavor to beverage recipes. Thanks to its easily soluble structure, it creates a smooth texture in hot and cold applications and offers standard taste in every preparation. Ideal for cafe, restaurant and professional kitchen use.\n\nAreas of Use\n- Used to make frappe and smoothie.\n- Milkshake applications\n- Cafe and restaurant menu drinks\n\nInstructions\n40 gr flavored beverage powder, 200 ml of cold milk (pasteurized or sterilized), 10 cubes of ice (equal to 200 ml water) is placed in the blender. It is stirred until the ice is broken, then served in cups.\n\nStorage Conditions\nKeep away from direct sunlight, keep in cool and dry place.",
      de: "Getränkepulver mit Melonengeschmack 1 kg\nDas Getränkepulver mit Melonengeschmack wurde entwickelt, um Getränkerezepten ein intensives, cremiges und süßes Melonenerlebnis zu verleihen. Dank seiner leicht löslichen Struktur sorgt es für eine geschmeidige Textur bei Heiß- und Kaltanwendungen und bietet einheitlichen Geschmack bei jeder Zubereitung. Ideal für den Einsatz in Cafés, Restaurants und professionellen Küchen.\n\nEinsatzgebiete\n- Wird zur Zubereitung von Frappe und Smoothie eingesetzt.\n- Milchshake-Anwendungen\n- Getränke von der Speisekarte des Cafés und Restaurants\n\nZubereitung\nEs werden 40 gr aromatisches Getränkepulver, 200 ml pasteurisierte oder sterilisierte kalte Milch, 10 Eiswürfel (gleichgestellt mit 200 ml Wasser) im Mixer gemischt bis die Eiswürfel zerkleinert werden. Später wird das Getränk in einem Glas serviert.\n\nLagerbedingungen\nVor Sonneneinstrahlung schützen, kühl und trocken lagern.",
      ar: "مسحوق مشروبات بنكهة البطيخ 1 كجم\nتم تطوير مسحوق المشروبات بنكهة البطيخ لإضفاء نكهة البطيخ المكثفة والكريمية والحلوة على وصفات المشروبات. بفضل بنيته سهلة الذوبان، فإنه يخلق ملمسًا ناعمًا في التطبيقات الساخنة والباردة ويقدم طعمًا قياسيًا في كل تحضير. مثالي للاستخدام في المقاهي والمطاعم والمطابخ المهنية.\n\nمجالات الاستخدام\n- يستخدم لصنع فرابيه وعصائر.\n- تطبيقات الميلك شيك\n- مشروبات قائمة المقاهي والمطاعم\n\nتعليمات الاستخدام\nيتم وضع 40 جرام من مسحوق المشروبات المنكهة، و200 مل من الحليب البارد (المبستر أو المعقم)، و10 مكعبات من الثلج (تساوي 200 مل من الماء) في الخلاط. يُقلب حتى ينكسر الثلج، ثم يُقدم في أكواب.\n\nشروط التخزين\nيحفظ بعيدا عن أشعة الشمس المباشرة، ويحفظ في مكان بارد وجاف."
    },
    besin_degerleri: JSON.stringify({
      pro_100g: {
        energie_kj: 1670,
        energie_kcal: 399,
        fett: 0,
        davon_gesaettigt: 0,
        kohlenhydrate: 98.7,
        davon_zucker: 92.8,
        ballaststoffe: 1.5,
        eiweiss: 0.1,
        salz: 0.1
      }
    })
  };

  console.log('Fixing Melon Powder...');
  
  const { data, error } = await supabase
    .from('urunler')
    .update(updateData)
    .eq('id', productId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Fix successful! Data:', JSON.stringify(data[0].ad, null, 2));
    console.log('Updated fields:', Object.keys(updateData).join(', '));
  }
}

fixMelonPowder();
