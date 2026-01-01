// scripts/analyze-location-data.mjs
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key for read-only

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Anon Key missing!');
    console.error('URL:', supabaseUrl);
    console.error('Key:', supabaseKey ? 'exists' : 'missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLocationData() {
    const { data, error } = await supabase
        .from('firmalar')
        .select('id, unvan, sehir, ilce, posta_kodu, google_maps_url, adres');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('📊 TOPLAM FİRMA:', data.length);
    console.log('\n' + '='.repeat(60));
    
    // Şehir Analizi
    console.log('\n🏙️  ŞEHİR DAĞILIMI (En fazla ilk 20)');
    console.log('-'.repeat(60));
    const cities = {};
    data.forEach(f => {
        const c = (f.sehir || 'BOŞ').trim();
        cities[c] = (cities[c] || 0) + 1;
    });
    Object.entries(cities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .forEach(([c, cnt]) => console.log(`  ${c.padEnd(30)} : ${cnt}`));
    
    // İlçe Analizi
    console.log('\n📍 İLÇE DAĞILIMI (En fazla ilk 30)');
    console.log('-'.repeat(60));
    const districts = {};
    data.forEach(f => {
        const d = (f.ilce || 'BOŞ').trim();
        districts[d] = (districts[d] || 0) + 1;
    });
    Object.entries(districts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .forEach(([d, cnt]) => console.log(`  ${d.padEnd(30)} : ${cnt}`));
    
    // PLZ Analizi
    console.log('\n📮 POSTA KODU (PLZ) DAĞILIMI (En fazla ilk 30)');
    console.log('-'.repeat(60));
    const plzs = {};
    data.forEach(f => {
        const p = (f.posta_kodu || 'BOŞ').trim();
        plzs[p] = (plzs[p] || 0) + 1;
    });
    Object.entries(plzs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .forEach(([p, cnt]) => console.log(`  ${p.padEnd(30)} : ${cnt}`));
    
    // Google Maps Linki Analizi
    console.log('\n🗺️  GOOGLE MAPS LİNKİ DURUMU');
    console.log('-'.repeat(60));
    const withMaps = data.filter(f => f.google_maps_url);
    const withoutMaps = data.filter(f => !f.google_maps_url);
    console.log(`  ✅ Google Maps linki OLAN    : ${withMaps.length}`);
    console.log(`  ❌ Google Maps linki OLMAYAN : ${withoutMaps.length}`);
    
    // Tutarsızlık Kontrolleri
    console.log('\n⚠️  VERİ KALİTESİ SORUNLARI');
    console.log('-'.repeat(60));
    
    // 1. Köln bölgesinde tutarsızlıklar
    const kolnVariants = data.filter(f => {
        const city = (f.sehir || '').toLowerCase().trim();
        return city.includes('köln') || city.includes('koln') || city.includes('cologne');
    });
    const kolnCityVariants = {};
    kolnVariants.forEach(f => {
        const c = f.sehir?.trim() || 'BOŞ';
        kolnCityVariants[c] = (kolnCityVariants[c] || 0) + 1;
    });
    console.log('\n  Köln için farklı şehir isimleri:');
    Object.entries(kolnCityVariants).forEach(([c, cnt]) => {
        console.log(`    ${c} : ${cnt}`);
    });
    
    // 2. Posta kodu var ama ilçe yok
    const plzButNoDistrict = data.filter(f => f.posta_kodu && !f.ilce);
    console.log(`\n  PLZ var ama İlçe YOK        : ${plzButNoDistrict.length}`);
    if (plzButNoDistrict.length > 0 && plzButNoDistrict.length <= 10) {
        plzButNoDistrict.forEach(f => {
            console.log(`    - ${f.unvan} (PLZ: ${f.posta_kodu})`);
        });
    }
    
    // 3. Posta kodu yok ama Google Maps var
    const mapsButNoPlz = data.filter(f => f.google_maps_url && !f.posta_kodu);
    console.log(`\n  Google Maps var ama PLZ YOK : ${mapsButNoPlz.length}`);
    if (mapsButNoPlz.length > 0 && mapsButNoPlz.length <= 10) {
        mapsButNoPlz.forEach(f => {
            console.log(`    - ${f.unvan} (Şehir: ${f.sehir || 'YOK'}, İlçe: ${f.ilce || 'YOK'})`);
        });
    }
    
    // 4. Hiç adres bilgisi yok
    const noAddressInfo = data.filter(f => !f.sehir && !f.ilce && !f.posta_kodu);
    console.log(`\n  Hiç adres bilgisi YOK       : ${noAddressInfo.length}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analiz tamamlandı!\n');
}

analyzeLocationData().catch(console.error);
