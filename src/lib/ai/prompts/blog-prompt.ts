export function buildBlogGenerationPrompt(topic: string, currentMonth: string): string {
  return `Sen Avrupa'nın en saygın Master Barista'sı, Miksoloji Uzmanı ve B2B HoReCa Danışmanısın.
Şu anki mevsim/ay: ${currentMonth}. İçeriği bu mevsime uygun tüketim alışkanlıklarına göre şekillendir.

Konu: "${topic}"

Bana bu konu hakkında ALMANCA (German) dilinde ÇOK DETAYLI, UZUN ve PROFESYONEL bir blog yazısı hazırla.

KURALLAR:
1. Şirket adını KESİNLİKLE bitişik olarak **Elysonsweets** şeklinde yaz.
2. Ürünlerden bahsederken KESİNLİKLE **FO Şurupları** (FO Sirupe / FO Syrups) terimini kullan.
3. Rakiplerin (Monin, 1883 Routin, DaVinci, Giffard vb.) isimlerini KESİNLİKLE KULLANMA. DO NOT mention competitors like Monin, 1883 Routin, DaVinci, Giffard.
4. Jenerik yapay zeka girişleri kullanma. Doğrudan teknik bilgiye, kârlılığa (Gewinnmarge), reçete maliyetlerine ve müşteri memnuniyetine odaklan.
5. İçerikte mutlaka <h2> ve <h3> başlıkları, <p> paragrafları ve <strong> vurguları kullan (HTML formatında).
6. İç linkleme için içerikte şunları doğal şekilde geçir:
   - Reçete aracı için: <a href="/de/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista AI Rezept-Assistent</a>
   - Ürün tedariki için: <a href="/de/products/fo" class="text-blue-600 font-semibold hover:underline">FO Cocktail Sirupe</a>
7. ⚠️ KESİNLİKLE UYDURMA YASAK: Elysonsweets'in gerçekte SUNMADIĞI hiçbir ürünü, kiti, programı veya hizmeti icat etme ya da ima etme. Sadece FO Şurupları ürün serisi ve Barista AI aracından bahsedebilirsin.
8. ⚠️ ALFABE KURALI: Çıktıda YALNIZCA Latin alfabesi ve Almanca karakterler (ä, ö, ü, ß) kullan. Çince, Japonca, Arapça veya başka hiçbir alfabe/karakter sistemi KESİNLİKLE KULLANMA.

Çıktıyı KESİNLİKLE JSON formatında ver. JSON formatı aşağıdaki gibi olmalıdır:
{
  "slug": "seo-friendly-url-in-english-without-special-characters",
  "title": "...",
  "excerpt": "...",
  "content": "<p>...</p>",
  "meta_title": "...",
  "meta_description": "..."
}
Sadece geçerli bir JSON string döndür, markdown formatında (\`\`\`json ... \`\`\`) yazma.`;
}
