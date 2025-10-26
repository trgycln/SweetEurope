// src/dictionaries/index.ts (Korrigiert)
import 'server-only';

// 1. Locale-Typ (unverändert)
export type Locale = 'de' | 'en' | 'tr' | 'ar';

// 2. Dictionaries-Map (unverändert)
const dictionaries = {
  de: () => import('./de').then((module) => module.dictionary),
  en: () => import('./en').then((module) => module.dictionary).catch(() => ({})),
  tr: () => import('./tr').then((module) => module.dictionary).catch(() => ({})),
  ar: () => import('./ar').then((module) => module.dictionary).catch(() => ({})),
};

// 3. getDictionary (KORRIGIERT)
export const getDictionary = async (locale: Locale) => {
  const loader = dictionaries[locale] || dictionaries.de;
  let dictionary;

  try {
    dictionary = await loader();
  } catch (error) {
    console.warn(`Wörterbuchdatei für ${locale} konnte nicht geladen werden. Fallback auf 'de'.`, error);
    dictionary = await dictionaries.de(); // Bei Importfehler auf Deutsch zurückfallen
  }

  // KORREKTUR: Prüfen, ob das geladene Wörterbuch leer ist
  // (passiert, wenn die Datei existiert, aber leer ist, oder .catch(() => ({})) ausgelöst wurde)
  if (Object.keys(dictionary).length === 0 && locale !== 'de') {
    console.warn(`Wörterbuch für ${locale} ist leer. Fallback auf 'de'.`);
    return await dictionaries.de();
  }

  // Wenn 'de' selbst leer ist (sollte nie passieren)
  if (Object.keys(dictionary).length === 0 && locale === 'de') {
     console.error("KRITISCHER FEHLER: de.ts Wörterbuch ist leer oder fehlt!");
     // Grundlegendes Fallback-Objekt zurückgeben, um Totalabsturz zu verhindern
     return { navigation: { home: "Start" } };
  }

  return dictionary;
};

// 4. Dictionary-Typ (unverändert)
export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;