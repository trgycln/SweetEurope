import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL veya KEY bulunamadı!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('1. Lezzet Dağıtım A.Ş. firması aranıyor...');
  
  const { data: bayiler, error: bayiErr } = await supabase
    .from('firmalar')
    .select('*')
    .ilike('unvan', '%Lezzet Dağıtım%');

  if (bayiErr) {
    console.error('Sorgu hatası:', bayiErr);
    return;
  }

  let lezzetBayi = bayiler?.[0];

  if (!lezzetBayi) {
    console.log('Lezzet Dağıtım A.Ş. bulunamadı, yeni oluşturuluyor...');
    const { data: yeniBayi, error: yeniBayiErr } = await supabase
      .from('firmalar')
      .insert({
        unvan: 'Lezzet Dağıtım A.Ş.',
        kategori: 'Alt Bayi',
        status: 'ALT BAYİ',
        ticari_tip: 'alt_bayi',
        sehir: 'Köln',
        ilce: 'Innenstadt',
        posta_kodu: '50667',
        telefon: '+49 221 9876543',
        email: 'info@lezzetdagitim.de',
        adres: 'Hohe Straße 12, 50667 Köln',
        yetkili_kisi: 'Ahmet Lezzet (Pilot Bayi)',
        oncelik: 'A',
        oncelik_puani: 95,
        goruldu: true,
      })
      .select()
      .single();

    if (yeniBayiErr) {
      console.error('Bayi oluşturulamadı:', yeniBayiErr);
      return;
    }
    lezzetBayi = yeniBayi;
  } else {
    console.log('Lezzet Dağıtım A.Ş. bulundu! ID:', lezzetBayi.id);
    // Kategori ve ticari_tip'in alt_bayi olduğundan emin olalım
    await supabase.from('firmalar').update({
      kategori: 'Alt Bayi',
      status: 'ALT BAYİ',
      ticari_tip: 'alt_bayi',
    }).eq('id', lezzetBayi.id);
  }

  console.log('Bayi ID:', lezzetBayi.id);

  // Bu bayiye ait örnek müşteriler
  const ornekMusteriler = [
    {
      unvan: 'Café Bella Vista Köln',
      kategori: 'Coffee Shop & Eiscafé',
      status: 'MÜŞTERİ',
      ticari_tip: 'musteri',
      sehir: 'Köln',
      ilce: 'Ehrenfeld',
      posta_kodu: '50823',
      telefon: '+49 221 445566',
      email: 'kontakt@bellavista-koeln.de',
      adres: 'Venloer Str. 240, 50823 Köln',
      yetkili_kisi: 'Marco Rossi',
      oncelik: 'A',
      oncelik_puani: 90,
      etiketler: ['#Yüksek_Sirkülasyon', '#Vitrin_Boş'],
      ust_bayi_firma_id: lezzetBayi.id,
      goruldu: true,
    },
    {
      unvan: 'Orient Shisha & Lounge',
      kategori: 'Shisha & Lounge',
      status: 'MÜŞTERİ',
      ticari_tip: 'musteri',
      sehir: 'Köln',
      ilce: 'Mülheim',
      posta_kodu: '51063',
      telefon: '+49 221 889900',
      email: 'lounge@orient-cologne.de',
      adres: 'Frankfurter Str. 55, 51063 Köln',
      yetkili_kisi: 'Murat Yılmaz',
      oncelik: 'A',
      oncelik_puani: 85,
      etiketler: ['#Türk_Sahibi', '#Teraslı'],
      ust_bayi_firma_id: lezzetBayi.id,
      goruldu: true,
    },
    {
      unvan: 'Bonn Grand Hotel & Event',
      kategori: 'Hotel & Event',
      status: 'NUMUNE VERİLDİ',
      ticari_tip: 'musteri',
      sehir: 'Bonn',
      ilce: 'Zentrum',
      posta_kodu: '53111',
      telefon: '+49 228 112233',
      email: 'events@grandhotel-bonn.de',
      adres: 'Berliner Freiheit 30, 53111 Bonn',
      yetkili_kisi: 'Julia Schmidt',
      oncelik: 'B',
      oncelik_puani: 75,
      etiketler: ['#Düğün_Mekanı', '#Lüks_Mekan'],
      ust_bayi_firma_id: lezzetBayi.id,
      goruldu: true,
    },
    {
      unvan: 'Elysion Bistro & Bakery',
      kategori: 'Casual Dining',
      status: 'ADAY',
      ticari_tip: 'musteri',
      sehir: 'Düsseldorf',
      ilce: 'Altstadt',
      posta_kodu: '40213',
      telefon: '+49 211 778899',
      email: 'info@elysionbistro.de',
      adres: 'Königsallee 80, 40213 Düsseldorf',
      yetkili_kisi: 'Can Demir',
      oncelik: 'B',
      oncelik_puani: 65,
      etiketler: ['#Yeni_Açılış'],
      ust_bayi_firma_id: lezzetBayi.id,
      goruldu: true,
    }
  ];

  console.log('2. Örnek müşteriler ekleniyor / güncelleniyor...');

  for (const m of ornekMusteriler) {
    const { data: existing } = await supabase
      .from('firmalar')
      .select('id')
      .eq('unvan', m.unvan)
      .single();

    if (existing) {
      console.log(`- Güncelleniyor: ${m.unvan}`);
      await supabase.from('firmalar').update(m).eq('id', existing.id);
    } else {
      console.log(`- Yeni ekleniyor: ${m.unvan}`);
      const { error: insErr } = await supabase.from('firmalar').insert(m);
      if (insErr) console.error(`Hata (${m.unvan}):`, insErr);
    }
  }

  console.log('\n✅ Tamamlandı! Lezzet Dağıtım A.Ş. altına 4 pilot müşteri bağlandı.');
}

main().catch(console.error);
