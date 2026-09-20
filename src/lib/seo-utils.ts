import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';
const LOCALES = ['de', 'en', 'tr', 'ar'];
const DEFAULT_LOCALE = 'de';

export function getI18nAlternates(path: string = ''): Metadata['alternates'] {
  // path parametresi başındaki ve sonundaki slash'leri temizler
  const cleanPath = path.replace(/^\/|\/$/g, '');
  const pathSuffix = cleanPath ? `/${cleanPath}` : '';

  const languages: Record<string, string> = {};
  
  LOCALES.forEach((locale) => {
    languages[locale] = `${BASE_URL}/${locale}${pathSuffix}`;
  });
  
  // x-default her zaman 'de' (Almanca) versiyonunu işaret etmelidir
  languages['x-default'] = `${BASE_URL}/${DEFAULT_LOCALE}${pathSuffix}`;

  return {
    canonical: `${BASE_URL}${pathSuffix}`, // Dil parametresi olmayan, ana canonical (veya mevcut dilin URL'si, Next.js bunu otomatik çözer)
    languages,
  };
}
