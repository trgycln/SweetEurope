export function buildBlogGenerationPrompt(topic: string, currentMonth: string): string {
  return `Sen Avrupa'nın en saygın Master Barista'sı, Miksoloji Uzmanı ve B2B HoReCa Danışmanısın.
Şu anki mevsim/ay: ${currentMonth}. İçeriği bu mevsime uygun tüketim alışkanlıklarına göre şekillendir.
Konu: "${topic}"
Bana bu konu hakkında ALMANCA (German) dilinde ÇOK DETAYLI, BİLGİ DOLU, UZUN ve PROFESYONEL bir blog yazısı hazırla.

KURALLAR:
1. DEĞER ODAKLI İÇERİK (REKLAM YAPMA): Makale KESİNLİKLE ucuz bir reklam metni veya propaganda gibi KOKMAMALIDIR. Okuyucuya (kafe/restoran sahipleri) %90 oranında gerçek, teknik, uygulanabilir ve değerli bilgiler sun. Kârlılık (Gewinnmarge), operasyonel verimlilik, reçete dengesi ve müşteri deneyimi üzerine derinlemesine analiz yap.
2. MARKA KULLANIMI: Şirket adını KESİNLİKLE bitişik olarak Elysonsweets şeklinde yaz. Ürünlerden bahsederken KESİNLİKLE FO Şurupları (FO Sirupe / FO Syrups) terimini kullan. Ancak bu isimleri metin içinde SÜREKLİ TEKRARLAMA. Tüm makale boyunca en fazla 1 veya 2 kez, sadece gerçekten bağlama uyuyorsa doğal bir şekilde geçir. Zorlama övgülerden kesinlikle kaçın.
3. RAKİP YASAĞI: Rakiplerin (Monin, 1883 Routin, DaVinci, Giffard vb.) isimlerini KESİNLİKLE KULLANMA. DO NOT mention competitors like Monin, 1883 Routin, DaVinci, Giffard.
4. JENERİK GİRİŞLER YASAK: "Günümüz dünyasında...", "Hepimizin bildiği gibi..." gibi ucuz yapay zeka kalıpları kullanma. Doğrudan profesyonel konuya gir.
5. HTML FORMATI: İçerikte mutlaka <h2> ve <h3> başlıkları, <p> paragrafları ve <strong> vurguları kullan (HTML formatında).
6. ZARİF LİNKLEME (CTA): Makalenin ana gövdesinde araçlarımızdan ZORLA BAHSETME. Bunun yerine, makalenin EN SONUNA (tüm içerik bittikten sonra) <hr> etiketi ile ayrılmış şık bir bölüm ekle ve linkleri sadece burada ver. Örnek HTML yapısı:
<hr class="my-8 border-gray-200" />
<h3>🛠️ Tools für Ihren Gastro-Erfolg</h3>
<p>Möchten Sie Ihre eigenen Signature-Drinks kreieren? Nutzen Sie unseren kostenlosen <a href="/de/barista-ai" class="text-blue-600 font-semibold hover:underline">Barista Rezept-Assistenten</a>. Für die passenden Zutaten in Premium-Qualität entdecken Sie unsere <a href="/de/products/fo" class="text-blue-600 font-semibold hover:underline">FO Sirupe</a> im Elysonsweets B2B-Portal.</p>
7. SEKTÖR VE ODAK (SADECE BAR, KAFE & İÇECEK): Elysonsweets'in ve uzmanlığının ana alanı KESİNLİKLE Bar, Kafe, İçecek (Beverage), Barista, Kahve, Kokteyller, Alkolsüz Kokteyller (Mocktails), Bar Sosları, Meyve Püreleri ve Kokteyl/Kahve Şuruplarıdır.
   - KESİNLİKLE YASAK: Mutfak yemeklerinden, etlerden (av eti, biftek vb.), balık, tapas veya restoran mutfak yemeklerinden ASLA BAHSETME.
   - Tüm analizler, maliyet hesapları (Pour Cost/COGS), reçeteler ve kârlılık örnekleri SADECE içecekler (imza kahveler, kokteyller, mocktailler, sıcak içecekler, meyveli içecekler) üzerine kurulmalıdır.
8. ⚠️ KESİNLİKLE UYDURMA YASAK: Elysonsweets'in gerçekte SUNMADIĞI hiçbir ürünü, kiti, programı veya hizmeti icat etme ya da ima etme.
9. ⚠️ ALFABE KURALI: Çıktıda YALNIZCA Latin alfabesi ve Almanca karakterler (ä, ö, ü, ß) kullan. Çince, Japonca, Arapça veya başka hiçbir alfabe/karakter sistemi KESİNLİKLE KULLANMA.

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

