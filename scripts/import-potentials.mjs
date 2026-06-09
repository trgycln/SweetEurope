import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

if (fs.existsSync('.env.local')) {
  config({ path: '.env.local' });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key is missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const filePath = path.join(process.cwd(), 'dokuments/data/Elysonsweets B2B Potansiyel Müşteri ve Rota Analizi (Köln) (2).xlsx');

function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getBaseName(str) {
    if (!str) return '';
    // Remove branch indicators like "Filiale", "Şube", "Köln", etc to group chains
    return str.toLowerCase()
        .replace(/filiale.*$/g, '')
        .replace(/şubesi.*$/g, '')
        .replace(/köln.*$/g, '')
        .replace(/kiosk/g, '')
        .replace(/bäckerei/g, '')
        .trim();
}

function isGenericAddress(address) {
    if (!address) return true;
    const lower = address.toLowerCase();
    // Must have a number (most real addresses have a house number)
    const hasNumber = /\d/.test(address);
    // Generic keywords
    const isGeneric = /(bölge|geneli|boyunca|çevresi|merkezi|umgebung)/.test(lower);
    
    return !hasNumber || isGeneric;
}

async function run() {
    console.log('Loading Excel file...');
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`Found ${data.length} rows in Excel.`);

    console.log('Fetching existing firmalar from database...');
    let allFirmalar = [];
    let page = 0;
    while (true) {
        const { data: chunk, error } = await supabase.from('firmalar')
            .select('id, unvan, adres, parent_firma_id')
            .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) {
            console.error('Error fetching firmalar:', error);
            process.exit(1);
        }
        allFirmalar.push(...chunk);
        if (chunk.length < 1000) break;
        page++;
    }

    console.log(`Fetched ${allFirmalar.length} existing firmalar.`);

    const existingNames = new Map();
    const existingAddresses = new Set();

    allFirmalar.forEach(f => {
        if (f.unvan) {
            const base = getBaseName(f.unvan);
            if (!existingNames.has(base)) existingNames.set(base, f.id);
        }
        if (f.adres) {
            existingAddresses.add(normalizeString(f.adres));
        }
    });

    let insertedCount = 0;
    let skippedGenericCount = 0;
    let skippedDuplicateAddressCount = 0;
    let chainsLinkedCount = 0;

    // First pass: identify chains in the Excel file itself
    const excelBaseNames = new Map();
    data.forEach(row => {
        const unvan = String(row['İşletme Adı'] || '').trim();
        if (!unvan) return;
        const base = getBaseName(unvan);
        excelBaseNames.set(base, (excelBaseNames.get(base) || 0) + 1);
    });

    for (const row of data) {
        const unvan = String(row['İşletme Adı'] || '').trim();
        const adres = String(row['Adres / Konum'] || '').trim();
        const plz = String(row['PLZ'] || '').trim();
        const urunEslesme = String(row['FO Ürün Eşleşmesi'] || '').trim();
        const strateji = String(row['Satış Stratejisi / Giriş Noktası'] || '').trim();

        if (!unvan) continue;

        if (isGenericAddress(adres)) {
            console.log(`Skipping generic address: ${unvan} - ${adres}`);
            skippedGenericCount++;
            continue;
        }

        const normAdres = normalizeString(adres);
        if (existingAddresses.has(normAdres)) {
            console.log(`Skipping duplicate address: ${unvan} - ${adres}`);
            skippedDuplicateAddressCount++;
            continue;
        }

        const base = getBaseName(unvan);
        let parentId = existingNames.get(base);
        let isChain = false;

        // Determine if chain
        if (parentId || (excelBaseNames.get(base) || 0) > 1) {
            isChain = true;
        }

        const oncelikPuani = isChain ? 20 : 0;
        
        const etiketler = [];
        if (urunEslesme) etiketler.push(`FO_URUN: ${urunEslesme}`);
        if (strateji) etiketler.push(`STRATEJI: ${strateji}`);

        const newFirma = {
            unvan: unvan,
            adres: adres,
            posta_kodu: plz,
            sehir: 'Köln',
            status: 'ADAY',
            ticari_tip: 'musteri',
            etiketler: etiketler.length > 0 ? etiketler : null,
            oncelik_puani: oncelikPuani,
            kaynak: 'Excel Import',
            parent_firma_id: parentId || null
        };

        const { data: insertedData, error } = await supabase.from('firmalar').insert(newFirma).select('id').single();

        if (error) {
            console.error(`Error inserting ${unvan}:`, error);
        } else {
            insertedCount++;
            existingAddresses.add(normAdres);

            // If it's a chain and we didn't have a parent yet, make this one the parent for future iterations
            if (isChain && !parentId) {
                existingNames.set(base, insertedData.id);
            }
            if (isChain && parentId) {
                chainsLinkedCount++;
            }
        }
    }

    console.log('\n--- IMPORT SUMMARY ---');
    console.log(`Total inserted: ${insertedCount}`);
    console.log(`Skipped (Generic address): ${skippedGenericCount}`);
    console.log(`Skipped (Duplicate address): ${skippedDuplicateAddressCount}`);
    console.log(`Chain branches linked: ${chainsLinkedCount}`);
}

run();
