import { generateTextWithFallback } from '@/lib/ai/providers';

export async function generateSeasonalTopic(): Promise<{ topic: string, currentMonthName: string }> {
  const currentMonth = new Date().getMonth();
  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  const currentMonthName = monthNames[currentMonth];

  const prompt = `Şu anki ay: ${currentMonthName}. 
Avrupa'daki kafeler, barlar, kokteyl salonları ve restoranların İÇECEK & BAR departmanları (Beverage & Bar) için bu mevsime ve trendlere en uygun, B2B kârlılık odaklı 1 adet blog konusu belirle.
ODAK NOKTASI: Kokteyller, mocktailler (alkolsüz kokteyller), özel kahveler (barista / specialty coffee), sıcak kış içecekleri, kokteyl ve kahve şurupları, bar sosları, meyve püreleri, içecek maliyet kontrolü (Pour Cost / Reçete Maliyeti) ve içecek menüsü kârlılığı.
KESİNLİKLE YASAK: Mutfak yemekleri, et, balık, sıcak yemekler, tapas veya genel mutfak gastronomisi ile ilgili konular KESİNLİKLE SEÇME. SADECE BAR & İÇECEK (BEVERAGE) odaklı olmalıdır.
Sadece konunun başlığını dön.`;

  const { text: generatedTopic } = await generateTextWithFallback({
    prompt,
    temperature: 0.8,
  });

  return { 
    topic: generatedTopic.trim(), 
    currentMonthName 
  };
}
