/**
 * PDF'de bulunup DB'de olmayan 9 FO ürününü Supabase'e ekler.
 * Çalıştırmak için: node scripts/insert_missing_fo.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Sabit değerler ─────────────────────────────────────────────────────────
const TEDARIKCI_ID = '1d650c3f-aede-45e5-9fd9-9a058e9e05ce';  // FO

// Kategoriler:
const KAT_SURUP   = 'fef2c710-0104-42ce-a31d-726105495a1b';  // Şuruplar
const KAT_TOZ     = '269509ca-3686-4c0d-9501-d2759356f059';  // Toz İçecekler
const KAT_PUREE   = '60149632-699d-496e-b951-0c668388f6e9';  // Meyveli Püre Soslar
const KAT_SOS_PAS = '5d6f7d2b-ad48-4136-89c1-27a7714e522d'; // Dondurma Sosları & Pastalar

// ── Yeni ürünler ───────────────────────────────────────────────────────────
const newProducts = [
    // ── 9 Gerçek yeni ürün ─────────────────────────────────────────────────

    // 1. KOI Foamer
    {
        stok_kodu:    'FO1270',
        slug:         'fo-koi-kokteyl-kopurtucu-100-ml',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 12,
        palet_ici_adet: 100,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO KOI Kokteyl Köpürtücü 100 ml',
            de: 'FO KOI Cocktail Schaumbildner 100 ml',
            en: 'FO KOI COCKTAIL FOAMER 100 ML',
            ar: 'FO KOI رغوة كوكتيل 100 مل',
        },
    },

    // 2. Condensed Milk Sauce 2.5 kg
    {
        stok_kodu:    'FO1271',
        slug:         'fo-tatlandirilmis-yogun-sut-sosu-2-5-kg',
        kategori_id:  KAT_SOS_PAS,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 60,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Tatlandırılmış Yoğun Süt Sosu 2,5 kg',
            de: 'FO Gesüßte Kondensmilchsauce 2,5 kg',
            en: 'FO Sweetened Condensed Milk Sauce 2.5 kg',
            ar: 'FO صلصة الحليب المكثف المحلى 2.5 كغ',
        },
    },

    // 3-9. Cocktail Mix ürünleri
    {
        stok_kodu:    'FO1272',
        slug:         'fo-hindistan-cevizi-ananas-pina-colada-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Hindistan Cevizi ve Ananas Aromalı İçecek / PINA COLADA Kokteyl Karışımı',
            de: 'FO Kokosnuss und Ananas Getränk / PINA COLADA Cocktail Mix',
            en: 'FO Coconut and Pine Apple Favored Beverage / PINA COLADA Cocktail Mix',
            ar: 'FO مشروب جوز الهند والأناناس / خليط كوكتيل بينا كولادا',
        },
    },
    {
        stok_kodu:    'FO1273',
        slug:         'fo-misket-limonu-margarita-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Misket Limonu Aromalı İçecek / MARGARITA Kokteyl Karışımı',
            de: 'FO Limette Getränk / MARGARITA Cocktail Mix',
            en: 'FO Lime Flavored Beverage / MARGARITA Cocktail Mix',
            ar: 'FO مشروب بنكهة الليمون / خليط كوكتيل مارغريتا',
        },
    },
    {
        stok_kodu:    'FO1274',
        slug:         'fo-hindistan-cevizi-blue-hawaii-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Hindistan Cevizi Aromalı İçecek / BLUE HAWAII Kokteyl Karışımı',
            de: 'FO Kokosnuss Getränk / BLUE HAWAII Cocktail Mix',
            en: 'FO Coconut Flavored Beverage / BLUE HAWAI Cocktail Mix',
            ar: 'FO مشروب بنكهة جوز الهند / خليط كوكتيل بلو هاواي',
        },
    },
    {
        stok_kodu:    'FO1275',
        slug:         'fo-grenadin-portakal-cosmopolitan-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Grenadin ve Portakal Aromalı İçecek / COSMOPOLITAN Kokteyl Karışımı',
            de: 'FO Grenadine und Orange Getränk / COSMOPOLITAN Cocktail Mix',
            en: 'FO Grenadine and Orange Flavored Beverage / COSMOPOLITAN Cocktail Mix',
            ar: 'FO مشروب بنكهة الرمان والبرتقال / خليط كوكتيل كوزموبوليتان',
        },
    },
    {
        stok_kodu:    'FO1276',
        slug:         'fo-grenadin-cilek-fruit-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Grenadin ve Çilek Aromalı İçecek / FRUIT Kokteyl Karışımı',
            de: 'FO Grenadine und Erdbeere Getränk / FRUIT Cocktail Mix',
            en: 'FO Grenadine and Strawberry Flavored Beverage / FRUIT Cocktail Mix',
            ar: 'FO مشروب بنكهة الرمان والفراولة / خليط كوكتيل فروت',
        },
    },
    {
        stok_kodu:    'FO1277',
        slug:         'fo-mango-sea-garden-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Mango Aromalı İçecek / SEA GARDEN Kokteyl Karışımı',
            de: 'FO Mango Getränk / SEA GARDEN Cocktail Mix',
            en: 'FO Mango Flavored Beverage / SEA GARDEN Coctail Mix',
            ar: 'FO مشروب بنكهة المانجو / خليط كوكتيل سي جاردن',
        },
    },
    {
        stok_kodu:    'FO1278',
        slug:         'fo-grenadin-seftali-x-on-the-beach-kokteyl',
        kategori_id:  KAT_SURUP,
        tedarikci_id: TEDARIKCI_ID,
        koli_ici_adet: 6,
        palet_ici_adet: 125,
        aktif: false,
        urun_gami: 'barista-bakery-essentials',
        lojistik_sinifi: 'cold-chain',
        stok_miktari: 0,
        stok_esigi: 0,
        aciklamalar: { tr: '', de: '', en: '', ar: '' },
        ad: {
            tr: 'FO Grenadin ve Şeftali Aromalı İçecek / X ON THE BEACH Kokteyl Karışımı',
            de: 'FO Grenadine und Pfirsich Getränk / X ON THE BEACH Cocktail Mix',
            en: 'FO Grenadine and Peach Flavored Beverage / X ON THE BEACH Cocktail Mix',
            ar: 'FO مشروب بنكهة الرمان والخوخ / خليط كوكتيل إكس أون ذا بيتش',
        },
    },
];

// ── Insert ─────────────────────────────────────────────────────────────────
async function insertProducts() {
    console.log(`Eklenecek ürün sayısı: ${newProducts.length}`);
    console.log('');

    let successCount = 0;
    let errorCount   = 0;

    for (const product of newProducts) {
        // Slug zaten var mı?
        const { data: existing } = await sb
            .from('urunler')
            .select('id, slug')
            .eq('slug', product.slug)
            .maybeSingle();

        if (existing) {
            console.log(`⏭  Atlandı (zaten mevcut): ${product.ad.tr}`);
            console.log(`   slug: ${product.slug}`);
            continue;
        }

        const { data, error } = await sb
            .from('urunler')
            .insert(product)
            .select('id, slug')
            .single();

        if (error) {
            console.error(`✗  HATA: ${product.ad.tr}`);
            console.error(`   ${error.message}`);
            errorCount++;
        } else {
            console.log(`✓  Eklendi: ${product.ad.tr}`);
            console.log(`   ID: ${data.id} | stok: ${product.stok_kodu} | koli: ${product.koli_ici_adet} | palet: ${product.palet_ici_adet}`);
            successCount++;
        }
    }

    console.log('');
    console.log('─'.repeat(60));
    console.log(`Sonuç: ${successCount} eklendi, ${errorCount} hata`);
}

insertProducts().catch(console.error);
