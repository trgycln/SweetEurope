const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function addProductAndBatchItem() {
  const barcode = '8691123462909';
  const partiId = '6fabdb6c-bf20-457b-8685-c61b2fb515f2';
  
  const productData = {
    ad: {
      tr: "FO Nane ve Misket Limonu Aromalı Baz Şurup 700 ml",
      en: "FO Mint and Lime Flavored Base Syrup 700 ml",
      de: "FO Minze und Limette Aromatisierter Basissirup 700 ml",
      ar: "فو شراب أساسي بنكهة النعناع والليمون 700 مل"
    },
    ean_gtin: barcode,
    stok_kodu: "FO-SRP-085", // Generating a unique enough one
    kategori_id: "73573007-1d9a-4574-921a-09fd1e610ad5",
    tedarikci_id: "1d650c3f-aede-45e5-9fd9-9a058e9e05ce",
    distributor_alis_fiyati: 2.208,
    satis_fiyati_musteri: 4.41,
    satis_fiyati_alt_bayi: 3.42,
    satis_fiyati_palet: 3.73,
    aktif: true,
    koli_ici_adet: 6,
    palet_ici_adet: 125,
    alis_fiyat_seviyesi: "adet",
    birim_agirlik_kg: 0.91,
    agirlik_kg: 0.91,
    lojistik_sinifi: "dry-load",
    almanya_kdv_orani: 7,
    slug: "fo-mint-lime-flavored-base-syrup-700-ml",
    aciklamalar: {
      tr: "Nane ve Misket Limonu Aromalı Baz Şurup 700 ml, nanenin serinletici aroması ile misket limonunun ferah ve asiditesi dengeli lezzetini bir araya getirerek içecek bazlı tariflerde dengeli ve tazeleyici bir tat sunmak için geliştirilmiştir. Akışkan yapısı sayesinde içeceklerle kolayca karışarak homojen bir yapı oluşturur. Kafe ve restoran menülerinde hızlı servis ve standart lezzet için idealdir.\n\nKullanım Alanları\n– Soğuk içecek ve baz tarifleri\n– Kokteyl ve mocktail uygulamaları\n– Limonata ve buzlu içecekler\n– Kafe ve restoran menü içecekleri\n\nÖne Çıkan Özellikler\n– Ferah nane ve misket limonu aroması\n– Baz içecekler için uygun şurup formu\n– Kolay karışan akışkan yapı\n– 700 ml ambalaj",
      en: "Mint and Lime Flavored Base Syrup 700 ml combines the cooling aroma of mint with the fresh and balanced acidity of lime to provide a balanced and refreshing taste in beverage-based recipes. Thanks to its fluid structure, it mixes easily with beverages and creates a homogeneous structure. Ideal for fast service and standard taste in cafe and restaurant menus.\n\nUsage Areas\n– Cold beverage and base recipes\n– Cocktail and mocktail applications\n– Lemonade and iced drinks\n– Cafe and restaurant menu drinks\n\nHighlights\n– Fresh mint and lime aroma\n– Suitable syrup form for base drinks\n– Easy to mix fluid structure\n– 700 ml packaging",
      de: "Der aromatisierte Basissirup Minze und Limette 700 ml kombiniert das kühlende Aroma der Minze mit der frischen und ausgewogenen Säure der Limette, um einen ausgewogenen und erfrischenden Geschmack in getränkebasierten Rezepten zu bieten. Dank seiner flüssigen Struktur lässt er sich leicht mit Getränken mischen und bildet eine homogene Struktur. Ideal für schnellen Service und Standardgeschmack auf Café- und Restaurantmenüs.\n\nEinsatzbereiche\n– Kaltgetränke und Basisrezepte\n– Cocktail- und Mocktail-Anwendungen\n– Limonade und Eisgetränke\n– Getränke für Café- und Restaurantmenüs\n\nHighlights\n– Frisches Minz- und Limettenaroma\n– Geeignete Sirupform für Basisgetränke\n– Leicht mischbare, flüssige Struktur\n– 700 ml Verpackung",
      ar: "يجمع شراب الأساس بنكهة النعناع والليمون 700 مل بين النكهة المنعشة للنعناع والحموضة الطازجة والمتوازنة لليمون لتوفير طعم متوازن ومنعش في الوصفات القائمة على المشروبات. بفضل هيكله السائل ، يمتزج بسهولة مع المشروبات ويخلق بنية متجانسة. مثالي للخدمة السريعة والطعم القياسي في قوائم المقاهي والمطاعم.\n\nمجالات الاستخدام\n– المشروبات الباردة ووصفات الأساس\n– تطبيقات الكوكتيل والموكتيل\n– عصير الليمون والمشروبات المثلجة\n– مشروبات قائمة المقاهي والمطاعم\n\nأبرز الميزات\n– رائحة النعناع الطازج والليمون\n– شكل شراب مناسب للمشروبات الأساسية\n– هيكل سائل سهل الخلط\n– عبوة 700 مل"
    },
    teknik_ozellikler: {
      bio: false, vegan: true, gmo_free: true, hacim_ml: "700",
      koli_ici_adet: 6, palet_ici_adet: 125, lojistik_sinifi: "dry-load"
    }
  };

  // Check if exists
  const { data: existing } = await supabase.from('urunler').select('id').eq('ean_gtin', barcode).maybeSingle();
  let urunId;
  
  if (existing) {
    console.log('Ürün zaten var:', existing.id);
    urunId = existing.id;
    // update it
    await supabase.from('urunler').update(productData).eq('id', urunId);
  } else {
    console.log('Ürün oluşturuluyor...');
    const { data: newProd, error } = await supabase.from('urunler').insert(productData).select('id').single();
    if(error) {
      console.error('Ürün ekleme hatası:', error);
      return;
    }
    urunId = newProd.id;
    console.log('Yeni ürün eklendi:', urunId);
  }

  // Listeye (Taslağa) ekle
  const koliSayisi = 40;
  const miktarAdet = koliSayisi * 6; // 240
  const basePrice = 2.208;
  const indirimliAlisFiyati = basePrice;
  const toplamAgirlikKg = parseFloat((miktarAdet * 0.91).toFixed(2)); // 218.4
  
  // check if item exists in batch
  const { data: existingItem } = await supabase.from('ithalat_parti_kalemleri')
    .select('id').eq('parti_id', partiId).eq('urun_id', urunId).maybeSingle();
    
  if(existingItem) {
    console.log('Listede zaten var, atlanıyor.');
  } else {
    console.log('Listeye ekleniyor...');
    const itemData = {
      ithalat_partisi_id: partiId,
      urun_id: urunId,
      miktar_adet: miktarAdet,
      koli_sayisi: koliSayisi,
      toplam_agirlik_kg: toplamAgirlikKg,
      birim_alis_fiyati_orijinal: basePrice,
      indirimli_alis_fiyati: indirimliAlisFiyati,
      ciplak_maliyet_eur: parseFloat((indirimliAlisFiyati * miktarAdet).toFixed(2)),
      dagitilan_navlun_eur: 0,
      dagitilan_gumruk_eur: 0,
      dagitilan_ozel_gider_eur: 0,
      operasyon_ve_risk_yuku_eur: 0,
      gercek_inis_maliyeti_net: 0,
      standart_inis_maliyeti_net: 0,
      maliyet_sapma_yuzde: 0
    };
    
    // insert
    // Note: Due to refactoring, table column name is parti_id or ithalat_partisi_id? 
    // In our utils it's ithalat_partisi_id, let's use both if uncertain or check schema.
    // Actually in ithalat-parti-actions.ts, we did: return { ...rest, parti_id: ithalat_partisi_id ?? partiId }
    // So the column in DB is parti_id!
    delete itemData.ithalat_partisi_id;
    itemData.parti_id = partiId;
    
    const { error: itemError } = await supabase.from('ithalat_parti_kalemleri').insert(itemData);
    if(itemError) {
      console.error('Kalem ekleme hatası:', itemError);
    } else {
      console.log('Başarıyla listeye eklendi.');
    }
  }
}

addProductAndBatchItem();
