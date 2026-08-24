import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    console.log('Tekrar deneniyor (Slug hatası düzeltildi)...');
    const { data: refPremium } = await supabase.from('urunler').select('*').eq('ean_gtin', '8691123471055').maybeSingle(); // Premium Karamel
    const { data: refStandard } = await supabase.from('urunler').select('*').eq('ean_gtin', '8691123120106').maybeSingle(); // Standart Vanilya

    const getNewProductData = (ref, barcode, price, names, stok_kodu) => {
        const p = { ...ref };
        delete p.id;
        delete p.created_at;
        delete p.updated_at;
        p.ean_gtin = barcode;
        p.distributor_alis_fiyati = price;
        p.stok_kodu = stok_kodu;
        p.slug = stok_kodu.toLowerCase(); // unique slug
        p.ad = {
            tr: names.tr,
            en: names.en,
            de: names.de,
            ar: names.ar
        };
        return p;
    };

    const itemsToCreate = [
        {
            barcode: '8691123471024', price: 5.50, stok_kodu: 'fo-srp-prem-nar',
            names: {
                tr: 'FO Nar Meyveli Şurup - Premium 700 ml',
                en: 'FO POMEGRANATE FRUIT SYRUP-PREMIUM 700 ML',
                de: 'FO Granatapfel Sirup - Premium 700 ml',
                ar: 'فو شراب الرمان - بريميوم 700 مل'
            },
            ref: refPremium
        },
        {
            barcode: '8691123470966', price: 5.50, stok_kodu: 'fo-srp-prem-sef',
            names: {
                tr: 'FO Şeftali Meyveli Şurup - Premium 700 ml',
                en: 'FO PEACH FRUIT SYRUP-PREMIUM 700 ML',
                de: 'FO Pfirsich Sirup - Premium 700 ml',
                ar: 'فو شراب الخوخ - بريميوم 700 مل'
            },
            ref: refPremium
        },
        {
            barcode: '8691123120571', price: 2.73, stok_kodu: 'fo-srp-beyazcik',
            names: {
                tr: 'FO Beyaz Çikolata Aromalı Şurup 700 ml',
                en: 'FO WHITE CHOCOLATE FLAVORED SYRUP 70 CL.',
                de: 'FO Weiße Schokolade Sirup 700 ml',
                ar: 'فو شراب بنكهة الشوكولاتة البيضاء 700 مل'
            },
            ref: refStandard
        },
        {
            barcode: '8691123120236', price: 2.73, stok_kodu: 'fo-srp-karamel',
            names: {
                tr: 'FO Karamel Aromalı Şurup 700 ml',
                en: 'FO CARAMEL FLAVORED SYRUP 70 CL.',
                de: 'FO Karamell Sirup 700 ml',
                ar: 'فو شراب بنكهة الكراميل 700 مل'
            },
            ref: refStandard
        },
        {
            barcode: '8691123120564', price: 2.73, stok_kodu: 'fo-srp-spearmint',
            names: {
                tr: 'FO Tatlı Nane Aromalı Şurup 700 ml',
                en: 'FO SPEARMINT FLAVORED SYRUP 70 CL.',
                de: 'FO Grüne Minze Sirup 700 ml',
                ar: 'فو شراب بنكهة النعناع 700 مل'
            },
            ref: refStandard
        }
    ];

    const newProductIds = {};
    const { data: passion } = await supabase.from('urunler').select('id').eq('ean_gtin', '8691123344656').maybeSingle();
    if (passion) newProductIds['8691123344656'] = passion.id;

    for (const item of itemsToCreate) {
        const { data: existing } = await supabase.from('urunler').select('id').eq('ean_gtin', item.barcode).maybeSingle();
        if (existing) {
            newProductIds[item.barcode] = existing.id;
            console.log(`${item.names.tr} zaten var. ID: ${existing.id}`);
        } else {
            const newProd = getNewProductData(item.ref, item.barcode, item.price, item.names, item.stok_kodu);
            const { data, error } = await supabase.from('urunler').insert(newProd).select('id').single();
            if (error) {
                console.error(`Ekleme hatası: ${item.barcode}`, error);
            } else {
                newProductIds[item.barcode] = data.id;
                console.log(`Eklendi: ${item.names.tr}`);
            }
        }
    }

    const pfQties = {
        '8691123344656': 30, // Passion Fruit
        '8691123471024': 5,  // Pomegranate Premium
        '8691123470966': 5,  // Peach Premium
        '8691123120571': 30, // White Choc Standard
        '8691123120236': 50, // Caramel Standard
        '8691123120564': 15  // Spearmint Standard
    };

    const draftKey = 'supplier_order_plan_draft_642896a8-ec56-4a58-917d-eafe2831a104';
    const { data: row } = await supabase.from('system_settings').select('*').eq('setting_key', draftKey).single();
    let draft = JSON.parse(row.setting_value);
    
    for (const [barcode, qty] of Object.entries(pfQties)) {
        const id = newProductIds[barcode];
        if (id) {
            const existingInDraft = draft.items.find(i => i.productId === id);
            if (existingInDraft) {
                existingInDraft.quantity = qty;
            } else {
                draft.items.push({ productId: id, quantity: qty, note: "" });
            }
        }
    }

    const { error: updError } = await supabase.from('system_settings').update({ setting_value: JSON.stringify(draft) }).eq('setting_key', draftKey);
    if (updError) console.error('Taslak hatası', updError);
    else console.log(`Taslak güncellendi, toplam kalem sayısı: ${draft.items.length}`);
}
run();
