const key = 'process.env.GEMINI_API_KEY || ''';

async function testMango() {
  const prompt = `Sen uzman bir gıda kimyageri ve çok dilli ürün yöneticisisin.
Ürün: MANGO FRUITED SYRUP-PREMIUM
Barkod: 8691123470973
Spekt Verisi: %40 mango suyu içerir. Raf ömrü 24 ay. 20-22 C. 100ml enerji 1420 kJ / 338 kcal, KH: 83.6g, şeker: 81.7g, yağ 0, protein 0, tuz 0. 1/8 seyreltme.

Aşağıdaki JSON formatında çıktıyı üret:
{
  "urun_kodu": "SP-FP-1249",
  "barkod": "8691123470973",
  "urun_adi": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "aciklamalar": { "de": "...", "en": "...", "tr": "...", "ar": "..." },
  "naehrwerte": { ... }
}
Sadece JSON üret.`;

  for (const m of ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
    try {
      console.log(`Trying ${m}...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json'
          }
        })
      });
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`✅ SUCCESS WITH ${m}:`);
        console.log(data.candidates[0].content.parts[0].text);
        return;
      } else {
        console.log(`❌ ${m}:`, data.error?.message || JSON.stringify(data));
      }
    } catch (e) {
      console.log(`Error ${m}:`, e.message);
    }
  }
}

testMango();
