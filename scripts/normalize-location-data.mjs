// scripts/normalize-location-data.mjs
// Bu script, firmalar tablosundaki şehir, ilçe ve posta kodu verilerini normalleştirir
// Özellikle Köln ve civarındaki tutarsızlıkları düzeltir

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Köln PLZ haritası - daha geniş
const KOLN_PLZ_DISTRICTS = {
    // Köln İç Şehir
    '50667': { city: 'Köln', district: 'Innenstadt' },
    '50668': { city: 'Köln', district: 'Neustadt-Nord' },
    '50670': { city: 'Köln', district: 'Neustadt-Nord' },
    '50672': { city: 'Köln', district: 'Neustadt-Süd' },
    '50674': { city: 'Köln', district: 'Neustadt-Süd' },
    '50676': { city: 'Köln', district: 'Altstadt-Süd' },
    '50677': { city: 'Köln', district: 'Altstadt-Nord' },
    '50678': { city: 'Köln', district: 'Altstadt-Nord' },
    '50679': { city: 'Köln', district: 'Deutz' },
    
    // Köln Dış Mahalleler
    '50733': { city: 'Köln', district: 'Nippes' },
    '50735': { city: 'Köln', district: 'Nippes' },
    '50737': { city: 'Köln', district: 'Weidenpesch' },
    '50739': { city: 'Köln', district: 'Longerich' },
    
    '50765': { city: 'Köln', district: 'Chorweiler' },
    '50767': { city: 'Köln', district: 'Chorweiler' },
    '50769': { city: 'Köln', district: 'Heimersdorf' },
    
    '50823': { city: 'Köln', district: 'Ehrenfeld' },
    '50825': { city: 'Köln', district: 'Ehrenfeld' },
    '50827': { city: 'Köln', district: 'Bickendorf' },
    
    '50931': { city: 'Köln', district: 'Lindenthal' },
    '50933': { city: 'Köln', district: 'Müngersdorf' },
    '50935': { city: 'Köln', district: 'Lindenthal' },
    '50937': { city: 'Köln', district: 'Sülz' },
    '50939': { city: 'Köln', district: 'Klettenberg' },
    
    '51061': { city: 'Köln', district: 'Höhenhaus' },
    '51063': { city: 'Köln', district: 'Mülheim' },
    '51065': { city: 'Köln', district: 'Buchheim' },
    '51067': { city: 'Köln', district: 'Holweide' },
    '51069': { city: 'Köln', district: 'Dellbrück' },
    
    '51103': { city: 'Köln', district: 'Kalk' },
    '51105': { city: 'Köln', district: 'Poll' },
    '51107': { city: 'Köln', district: 'Ostheim' },
    '51109': { city: 'Köln', district: 'Merheim' },
    
    '51143': { city: 'Köln', district: 'Porz' },
    '51145': { city: 'Köln', district: 'Porz' },
    '51147': { city: 'Köln', district: 'Porz' },
    '51149': { city: 'Köln', district: 'Porz' },
    
    // Köln Çevresi - Önemli Şehirler
    '50126': { city: 'Bergheim', district: 'Bergheim' },
    '50127': { city: 'Bergheim', district: 'Bergheim' },
    
    '50169': { city: 'Kerpen', district: 'Kerpen' },
    '50170': { city: 'Kerpen', district: 'Kerpen' },
    
    '50181': { city: 'Bedburg', district: 'Bedburg' },
    
    '50189': { city: 'Elsdorf', district: 'Elsdorf' },
    
    '50259': { city: 'Pulheim', district: 'Pulheim' },
    
    '50321': { city: 'Brühl', district: 'Brühl' },
    
    '50354': { city: 'Hürth', district: 'Hürth' },
    
    '50374': { city: 'Erftstadt', district: 'Erftstadt' },
    
    '50389': { city: 'Wesseling', district: 'Wesseling' },
    
    '50996': { city: 'Köln', district: 'Rodenkirchen' },
    '50997': { city: 'Köln', district: 'Godorf' },
    '50999': { city: 'Köln', district: 'Weiß' },
    
    '51143': { city: 'Köln', district: 'Porz' },
    
    '51149': { city: 'Köln', district: 'Grengel' },
    
    '51427': { city: 'Bergisch Gladbach', district: 'Bensberg' },
    '51429': { city: 'Bergisch Gladbach', district: 'Bergisch Gladbach' },
    
    '51465': { city: 'Bergisch Gladbach', district: 'Bergisch Gladbach' },
    
    '51469': { city: 'Bergisch Gladbach', district: 'Bergisch Gladbach' },
    
    '51503': { city: 'Rösrath', district: 'Rösrath' },
    
    '51580': { city: 'Reichshof', district: 'Reichshof' },
    
    '53113': { city: 'Bonn', district: 'Bonn-Zentrum' },
    '53115': { city: 'Bonn', district: 'Bonn' },
    '53117': { city: 'Bonn', district: 'Bonn' },
    '53119': { city: 'Bonn', district: 'Bonn' },
    '53121': { city: 'Bonn', district: 'Bonn' },
    '53123': { city: 'Bonn', district: 'Bonn' },
    '53125': { city: 'Bonn', district: 'Bonn' },
    '53127': { city: 'Bonn', district: 'Bonn' },
    '53129': { city: 'Bonn', district: 'Bonn' },
    
    '53173': { city: 'Bonn', district: 'Bad Godesberg' },
    '53175': { city: 'Bonn', district: 'Bad Godesberg' },
    
    '53225': { city: 'Bonn', district: 'Beuel' },
    '53227': { city: 'Bonn', district: 'Beuel' },
    '53229': { city: 'Bonn', district: 'Beuel' },
};

// Şehir normalizasyonu - Köln varyantları
const CITY_NORMALIZATIONS = {
    'köln': 'Köln',
    'koln': 'Köln',
    'cologne': 'Köln',
    'cöln': 'Köln',
    'köln-mülheim': 'Köln',
    'köln-ehrenfeld': 'Köln',
    'köln-nippes': 'Köln',
    'köln-porz': 'Köln',
    'köln-kalk': 'Köln',
    'köln-deutz': 'Köln',
    'bonn': 'Bonn',
    'bergisch gladbach': 'Bergisch Gladbach',
    'brühl': 'Brühl',
    'hürth': 'Hürth',
    'wesseling': 'Wesseling',
    'pulheim': 'Pulheim',
    'frechen': 'Frechen',
    'kerpen': 'Kerpen',
    'bergheim': 'Bergheim',
};

async function normalizeLocationData(dryRun = true) {
    console.log('🔍 Firmalar verisi çekiliyor...\n');
    
    const { data: companies, error } = await supabase
        .from('firmalar')
        .select('id, unvan, sehir, ilce, posta_kodu, adres, google_maps_url');

    if (error) {
        console.error('❌ Veri çekilemedi:', error);
        return;
    }

    console.log(`📊 Toplam ${companies.length} firma bulundu.\n`);
    
    const updates = [];
    let plzNormalized = 0;
    let cityNormalized = 0;
    let mapsButNoPlz = 0;
    let noLocationData = 0;

    for (const company of companies) {
        const update = { id: company.id };
        let needsUpdate = false;
        const changes = [];

        // 1. PLZ varsa ve haritada varsa, şehir ve ilçe güncelle
        if (company.posta_kodu && KOLN_PLZ_DISTRICTS[company.posta_kodu]) {
            const location = KOLN_PLZ_DISTRICTS[company.posta_kodu];
            
            if (company.sehir !== location.city) {
                update.sehir = location.city;
                needsUpdate = true;
                changes.push(`Şehir: "${company.sehir}" → "${location.city}"`);
                cityNormalized++;
            }
            
            if (company.ilce !== location.district) {
                update.ilce = location.district;
                needsUpdate = true;
                changes.push(`İlçe: "${company.ilce}" → "${location.district}"`);
                plzNormalized++;
            }
        }
        
        // 2. Şehir normalizasyonu (Köln varyantları)
        if (company.sehir) {
            const normalizedCity = CITY_NORMALIZATIONS[company.sehir.toLowerCase().trim()];
            if (normalizedCity && company.sehir !== normalizedCity) {
                update.sehir = normalizedCity;
                needsUpdate = true;
                changes.push(`Şehir normalize: "${company.sehir}" → "${normalizedCity}"`);
                cityNormalized++;
            }
        }

        // 3. Google Maps var ama PLZ yok - uyarı
        if (company.google_maps_url && !company.posta_kodu) {
            mapsButNoPlz++;
            changes.push(`⚠️  Google Maps var ama PLZ yok`);
        }

        // 4. Hiç konum bilgisi yok
        if (!company.sehir && !company.ilce && !company.posta_kodu && !company.google_maps_url) {
            noLocationData++;
        }

        if (needsUpdate) {
            updates.push(update);
            console.log(`\n📝 ${company.unvan} (${company.id})`);
            changes.forEach(change => console.log(`   ${change}`));
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 NORMALIZASYON ÖZETİ');
    console.log('='.repeat(70));
    console.log(`✅ PLZ bazlı güncelleme gereken:    ${plzNormalized}`);
    console.log(`✅ Şehir normalizasyonu gereken:    ${cityNormalized}`);
    console.log(`⚠️  Google Maps var ama PLZ yok:    ${mapsButNoPlz}`);
    console.log(`❌ Hiç konum bilgisi yok:           ${noLocationData}`);
    console.log(`🔄 Toplam güncellenecek firma:      ${updates.length}`);
    console.log('='.repeat(70));

    if (updates.length === 0) {
        console.log('\n✅ Hiçbir güncelleme gerekmedi!');
        return;
    }

    if (dryRun) {
        console.log('\n⚠️  DRY RUN modu - Hiçbir değişiklik kaydedilmedi.');
        console.log('💡 Değişiklikleri kaydetmek için scripti --apply parametresi ile çalıştırın:');
        console.log('   node scripts/normalize-location-data.mjs --apply');
        return;
    }

    // Gerçek güncelleme
    console.log('\n🔄 Güncellemeler uygulanıyor...');
    
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
        const { error } = await supabase
            .from('firmalar')
            .update(update)
            .eq('id', update.id);

        if (error) {
            console.error(`❌ Hata (${update.id}):`, error.message);
            errorCount++;
        } else {
            successCount++;
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Güncelleme tamamlandı!');
    console.log(`   Başarılı: ${successCount}`);
    console.log(`   Hatalı:   ${errorCount}`);
    console.log('='.repeat(70));
}

// Script parametrelerini kontrol et
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');

if (applyChanges) {
    console.log('⚠️  APPLY modu aktif - Değişiklikler veritabanına kaydedilecek!\n');
} else {
    console.log('ℹ️  DRY RUN modu - Sadece önizleme yapılacak\n');
}

normalizeLocationData(!applyChanges).catch(console.error);
