// src/dictionaries/index.ts
import 'server-only';

// Desteklenen diller için tipleri tanımla
type Locale = 'de' | 'en' | 'tr' | 'ar';

// Sözlük dosyalarını dinamik olarak import edecek bir harita (map) oluştur
const dictionaries = {
  de: () => import('./de').then((module) => module.dictionary),
  // Henüz diğer diller için dosyanız olmasa bile, geleceğe hazırlık için bu satırları ekleyin.
  // Next.js, dosya olmadığında hata vermemesi için geçici bir çözüm üretecektir.
  // Veya bu diller için boş .ts dosyaları oluşturabilirsiniz.
  en: () => import('./en').then((module) => module.dictionary).catch(() => ({})),
  tr: () => import('./tr').then((module) => module.dictionary).catch(() => ({})),
  ar: () => import('./ar').then((module) => module.dictionary).catch(() => ({})),
};

// Gelen dil koduna göre doğru sözlüğü getiren fonksiyon
export const getDictionary = async (locale: Locale) => {
  // Eğer istenen dil desteklenmiyorsa veya dosyası bulunamazsa, varsayılan olarak Almanca'yı getir
  const loader = dictionaries[locale] || dictionaries.de;
  try {
    return await loader();
  } catch (error) {
    console.warn(`Sözlük dosyası bulunamadı: ${locale}, varsayılan ('de') kullanılıyor.`);
    return await dictionaries.de();
  }
};

// Sözlük tipini dışa aktar, böylece bileşenlerde kullanabiliriz
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;