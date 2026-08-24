import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, serviceRoleKey);

// Normalize text for matching
function normalizeText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findDuplicates() {
  const { data: dbProducts, error } = await supabase
    .from('urunler')
    .select('id, stok_kodu, ad, aktif, distributor_alis_fiyati');

  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }

  // 1. Check for Duplicate Stock Codes
  const stockCodes = {};
  const duplicateStockCodes = [];

  // 2. Check for Duplicate Names (TR or EN)
  const names = {};
  const duplicateNames = [];

  for (const p of dbProducts) {
    // Stock Code
    if (p.stok_kodu && p.stok_kodu.trim() !== '') {
      const code = p.stok_kodu.trim().toUpperCase();
      if (!stockCodes[code]) stockCodes[code] = [];
      stockCodes[code].push(p);
    }

    // Name
    let enName = '';
    let trName = '';

    if (typeof p.ad === 'string') {
      trName = p.ad;
    } else if (p.ad && typeof p.ad === 'object') {
      enName = p.ad.en || '';
      trName = p.ad.tr || Object.values(p.ad)[0] || '';
    }

    const normEn = normalizeText(enName);
    const normTr = normalizeText(trName);

    // Use TR name as primary key for name duplication, or EN if TR is missing
    const key = normTr || normEn;
    if (key) {
      if (!names[key]) names[key] = [];
      names[key].push(p);
    }
  }

  for (const [code, items] of Object.entries(stockCodes)) {
    if (items.length > 1) {
      duplicateStockCodes.push({ code, items });
    }
  }

  for (const [name, items] of Object.entries(names)) {
    if (items.length > 1) {
      duplicateNames.push({ name, items });
    }
  }

  // Output as Markdown
  let md = `# Veritabanı Mükerrer Ürün Raporu\n\n`;
  
  md += `## 1. Aynı Stok Koduna Sahip Ürünler\n`;
  if (duplicateStockCodes.length === 0) {
    md += `*Mükerrer stok koduna sahip ürün bulunamadı.*\n\n`;
  } else {
    for (const dup of duplicateStockCodes) {
      md += `### Stok Kodu: ${dup.code}\n`;
      for (const item of dup.items) {
        const adName = typeof item.ad === 'object' ? (item.ad.tr || item.ad.en) : item.ad;
        md += `- **ID:** ${item.id} | **Adı:** ${adName} | **Aktif:** ${item.aktif ? 'Evet' : 'Hayır'} | **Alış Fiyatı:** €${item.distributor_alis_fiyati}\n`;
      }
      md += `\n`;
    }
  }

  md += `## 2. Aynı (veya Çok Benzer) İsme Sahip Ürünler\n`;
  if (duplicateNames.length === 0) {
    md += `*Mükerrer isme sahip ürün bulunamadı.*\n\n`;
  } else {
    for (const dup of duplicateNames) {
      md += `### İsim Eşleşmesi: "${dup.name}"\n`;
      for (const item of dup.items) {
        const adName = typeof item.ad === 'object' ? (item.ad.tr || item.ad.en) : item.ad;
        md += `- **ID:** ${item.id} | **Stok Kodu:** ${item.stok_kodu || 'Yok'} | **Orijinal Adı:** ${adName} | **Aktif:** ${item.aktif ? 'Evet' : 'Hayır'} | **Alış Fiyatı:** €${item.distributor_alis_fiyati}\n`;
      }
      md += `\n`;
    }
  }

  fs.writeFileSync('mukerrer_raporu.md', md, 'utf-8');
  console.log('Rapor mukerrer_raporu.md olarak kaydedildi.');
}

findDuplicates().catch(console.error);
