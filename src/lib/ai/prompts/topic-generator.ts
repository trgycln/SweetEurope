import { generateTextWithFallback } from '@/lib/ai/providers';

export async function generateSeasonalTopic(): Promise<{ topic: string, currentMonthName: string }> {
  const currentMonth = new Date().getMonth();
  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", 
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  const currentMonthName = monthNames[currentMonth];

  const prompt = `Şu anki ay: ${currentMonthName}. Avrupa'daki kafeler, restoranlar ve oteller (HoReCa) için bu mevsime ve yaklaşan trendlere en uygun, B2B kârlılık odaklı 1 adet blog konusu belirle. Sadece konunun başlığını dön.`;

  const { text: generatedTopic } = await generateTextWithFallback({
    prompt,
    temperature: 0.8,
  });

  return { 
    topic: generatedTopic.trim(), 
    currentMonthName 
  };
}
