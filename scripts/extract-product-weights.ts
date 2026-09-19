/**
 * Ürün Ağırlık Çıkarma Scripti — Google Gemini AI
 * Ürün adlarından ağırlık bilgilerini otomatik çıkarır ve veritabanına yazar.
 *
 * Gereksinim:
 *   NEXT_PUBLIC_SUPABASE_URL       → Supabase proje URL'si
 *   SUPABASE_SERVICE_ROLE_KEY      → Service role key (admin erişimi)
 *   GEMINI_API_KEY                 → Google Gemini API key
 *
 * Kullanım:
 *   npx dotenv -e .env.local -- npx ts-node --project tsconfig.scripts.json scripts/extract-product-weights.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface WeightExtractionResult {
  id: string;
  name: string;
  extractedWeightKg: number | null;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

// -----------------------------------------------------------------------
// 1. Regex ile ağırlık çıkarma (ücretsiz, hızlı)
// -----------------------------------------------------------------------
function extractWeightByRegex(productName: string): { kg: number | null; source: string } {
  const name = productName.toLowerCase();

  // Gram: "200g", "200 g", "200 gr", "200 gramm"
  const gramMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramm)(?!\w)/i);
  if (gramMatch) {
    const grams = parseFloat(gramMatch[1].replace(',', '.'));
    return { kg: Number((grams / 1000).toFixed(4)), source: `regex:${grams}g` };
  }

  // Kilogram: "1,5 kg", "1.5kg", "2 kg"
  const kgMatch = name.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1].replace(',', '.'));
    return { kg, source: `regex:${kg}kg` };
  }

  // Mililitre (sıvılar — yoğunluk ~1 g/ml varsayımı)
  const mlMatch = name.match(/(\d+(?:[.,]\d+)?)\s*ml/i);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1].replace(',', '.'));
    return { kg: Number((ml / 1000).toFixed(4)), source: `regex:${ml}ml` };
  }

  // Santilitre (cl): "70 cl", "70cl" -> 1 cl = 10 ml = 0.01 kg
  const clMatch = name.match(/(\d+(?:[.,]\d+)?)\s*cl(?!\w)/i);
  if (clMatch) {
    const cl = parseFloat(clMatch[1].replace(',', '.'));
    return { kg: Number(((cl * 10) / 1000).toFixed(4)), source: `regex:${cl}cl` };
  }

  // Litre: "1l", "1 litre", "0.5l"
  const lMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litre|liter)(?!\w)/i);
  if (lMatch) {
    const liter = parseFloat(lMatch[1].replace(',', '.'));
    return { kg: liter, source: `regex:${liter}L` };
  }

  return { kg: null, source: 'regex:not_found' };
}

// -----------------------------------------------------------------------
// 2. Gemini AI ile ağırlık çıkarma (temperature=0 → deterministik)
// -----------------------------------------------------------------------
async function extractWeightWithGemini(
  batch: Array<{ id: string; name: string }>,
  apiKey: string
): Promise<Array<{ id: string; kg: number | null; reason: string }>> {
  const prompt = `
Sen bir Alman tatlı ve şekerleme ürünleri uzmanısın.
Aşağıdaki ürün adı listesini incele ve her ürünün ağırlığını kilogram cinsinden döndür.
KURAL: Yalnızca ürün adında açıkça yazılı olan ağırlığı yaz (g, gr, kg, ml, L vb. birimler).
Tahmin yapma. Ağırlık açıkça yazılı değilse null yaz.

Yanıtı SADECE aşağıdaki JSON formatında ver, başka hiçbir şey ekleme:
[
  { "id": "uuid-here", "kg": 0.250, "reason": "250g → 0.25 kg" },
  { "id": "uuid-here", "kg": null, "reason": "ağırlık bilgisi yok" }
]

Ürün listesi:
${batch.map(p => `{ "id": "${p.id}", "name": "${p.name}" }`).join('\n')}
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, // Maksimum determinizm
          topP: 1,
          topK: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API hatası: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`Gemini yanıtından JSON çıkarılamadı:\n${text}`);

  return JSON.parse(jsonMatch[0]);
}

// -----------------------------------------------------------------------
// 3. Ana İşlem
// -----------------------------------------------------------------------
async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY veya GOOGLE_GENERATIVE_AI_API_KEY ortam değişkeni gerekli');
    process.exit(1);
  }

  // Ağırlığı eksik ürünleri çek
  const { data: products, error } = await supabase
    .from('urunler')
    .select('id, ad, agirlik_kg')
    .is('agirlik_kg', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Ürünler çekilemedi:', error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('✅ Tüm ürünlerin ağırlık bilgisi zaten mevcut.');
    return;
  }

  console.log(`📦 ${products.length} ürün işlenecek...\n`);

  const results: WeightExtractionResult[] = [];
  const needsGemini: Array<{ id: string; name: string }> = [];

  // Regex ile dene
  for (const product of products) {
    const nameRaw = product.ad;
    const name = typeof nameRaw === 'object' && nameRaw !== null
      ? (nameRaw as Record<string, string>).de
        || (nameRaw as Record<string, string>).tr
        || Object.values(nameRaw as Record<string, string>)[0]
        || ''
      : String(nameRaw || '');

    const { kg, source } = extractWeightByRegex(name);

    if (kg !== null) {
      results.push({ id: product.id, name, extractedWeightKg: kg, confidence: 'high', source });
      console.log(`  ✅ [REGEX] "${name}" → ${kg} kg`);
    } else {
      needsGemini.push({ id: product.id, name });
    }
  }

  // Gemini ile dene (batch 20)
  if (needsGemini.length > 0) {
    console.log(`\n🤖 ${needsGemini.length} ürün Gemini AI ile işlenecek...\n`);
    const BATCH_SIZE = 20;

    for (let i = 0; i < needsGemini.length; i += BATCH_SIZE) {
      const batch = needsGemini.slice(i, i + BATCH_SIZE);
      try {
        const geminiResults = await extractWeightWithGemini(batch, apiKey);
        for (const res of geminiResults) {
          const product = batch.find(p => p.id === res.id);
          if (!product) continue;
          results.push({
            id: res.id,
            name: product.name,
            extractedWeightKg: res.kg,
            confidence: res.kg !== null ? 'medium' : 'low',
            source: `gemini:${res.reason}`,
          });
          const icon = res.kg !== null ? '🤖' : '⚠️ ';
          console.log(`  ${icon} [GEMINI] "${product.name}" → ${res.kg ?? 'NULL'} kg`);
        }
        if (i + BATCH_SIZE < needsGemini.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Gemini hatası:`, message);
        for (const p of batch) {
          if (!results.find(r => r.id === p.id)) {
            results.push({
              id: p.id,
              name: p.name,
              extractedWeightKg: null,
              confidence: 'low',
              source: 'failed',
            });
          }
        }
      }
    }
  }

  // Supabase'e yaz
  const toUpdate = results.filter(r => r.extractedWeightKg !== null);
  console.log(`\n💾 ${toUpdate.length} ürün güncelleniyor...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from('urunler')
      .update({ agirlik_kg: item.extractedWeightKg })
      .eq('id', item.id);

    if (updateError) {
      console.error(`  ❌ "${item.name}":`, updateError.message);
      failCount++;
    } else {
      successCount++;
    }
  }

  const noWeight = results.filter(r => r.extractedWeightKg === null);

  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ Güncellendi:            ${successCount} ürün`);
  console.log(`❌ Güncelleme hatası:      ${failCount} ürün`);
  console.log(`⚠️  Ağırlık tespit edilemedi: ${noWeight.length} ürün`);

  if (noWeight.length > 0) {
    console.log('\n⚠️  Elle girilmesi veya ağırlığı belirtilmemiş ürünler:');
    noWeight.forEach(p => console.log(`   - "${p.name}" (ID: ${p.id})`));
  }

  console.log('\n✅ Script tamamlandı.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('❌ Script hatası:', message);
  process.exit(1);
});
