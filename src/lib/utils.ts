// src/lib/utils.ts (Ihre vorhandenen Funktionen + die neue formatDate Funktion)

// --- Locale Typ Definition ---
// Da du keine separate i18n-config.ts hast, definieren wir den Typ hier
// basierend auf deinen Dictionary-Dateien.
export type Locale = 'de' | 'en' | 'tr' | 'ar';

/**
 * Holt den lokalisierten Namen aus einem JSON-Objekt oder gibt einen Fallback zurück.
 * @param adObj Das Objekt mit Sprachcodes als Schlüssel (z.B. { de: 'Name DE', tr: 'Name TR' }) oder ein einfacher String.
 * @param locale Der gewünschte Sprachcode ('de', 'en', 'tr', 'ar').
 * @param fallbackLocale Ein optionaler Fallback-Sprachcode (Standard: 'de').
 * @returns Der lokalisierte String oder ein Standard-Fallback ('Unbenannt').
 */
export const getLocalizedName = (
    adObj: any,
    locale: Locale,
    fallbackLocale: Locale = 'de'
): string => {
    let name: string | null = null;
    if (typeof adObj === 'object' && adObj !== null) {
        // Versuche die angeforderte Sprache, dann den Fallback, dann die erste verfügbare Sprache
        name = adObj[locale] || adObj[fallbackLocale] || Object.values(adObj)[0] as string;
    } else if (typeof adObj === 'string') {
        // Wenn es bereits ein String ist, verwende ihn direkt
        name = adObj;
    }
    // Stelle sicher, dass immer ein String zurückgegeben wird
    return String(name || 'Unbenannt');
};

/**
 * Formatiert einen Zahlenwert als Währung.
 * @param value Der Zahlenwert.
 * @param locale Der Sprachcode für die Formatierung ('de', 'en', 'tr', 'ar').
 * @param currency Der Währungscode (Standard: 'EUR').
 * @returns Der formatierte Währungsstring oder '-'.
 */
export const formatCurrency = (
    value: number | null | undefined,
    locale: Locale,
    currency: 'EUR' | 'TRY' = 'EUR' // Füge bei Bedarf weitere Währungen hinzu
) => {
    if (value === null || value === undefined) return '-';

    // Bestimme das Locale-Format für Intl.NumberFormat
    let localeFormat: string;
    switch (locale) {
        case 'tr': localeFormat = 'tr-TR'; break;
        case 'en': localeFormat = 'en-US'; break; // Oder 'en-GB' etc.
        case 'ar': localeFormat = 'ar-SA'; break; // Beispiel für Arabisch
        case 'de':
        default: localeFormat = 'de-DE'; break;
    }

    try {
        return new Intl.NumberFormat(localeFormat, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2, // Immer 2 Nachkommastellen anzeigen
            maximumFractionDigits: 2
        }).format(value);
    } catch (error) {
        console.error("Fehler beim Formatieren der Währung:", error);
        // Fallback
        return `${value.toFixed(2)} ${currency}`;
    }
};

/**
 * ++ NEU HINZUGEFÜGT ++
 * Konvertiert einen Datum-String in ein lesbares, lokalisiertes Format.
 * @param dateString Der zu formatierende Datum-String (z.B. aus der Datenbank).
 * @param locale Der Sprachcode für die Formatierung.
 * @returns Der formatierte Datums- und Zeit-String.
 */
export const formatDate = (dateString: string | null | undefined, locale: Locale): string => {
    if (!dateString) return '-';
    try {
        // Bestimme das Locale-Format für die korrekte Darstellung
        const localeFormat = locale === 'tr' ? 'tr-TR' : 'de-DE';
        return new Date(dateString).toLocaleString(localeFormat, {
            dateStyle: 'long',  // z.B. "20. Oktober 2025"
            timeStyle: 'short', // z.B. "10:30"
        });
    } catch (error) {
        console.error("Ungültiges Datumsformat:", dateString, error);
        return dateString; // Fallback auf den Originalstring
    }
};


/**
 * Konvertiert einen Text in ein URL-freundliches "Slug"-Format.
 * @param text Der zu konvertierende Text.
 * @returns Der Slug-String.
 */
export function slugify(text: string): string {
    if (!text) return '';

    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Leerzeichen durch '-' ersetzen
        .replace(p, c => b.charAt(a.indexOf(c))) // Sonderzeichen ersetzen
        .replace(/&/g, '-und-') // '&' ersetzen
        .replace(/[^\w-]+/g, '') // Alle nicht-alphanumerischen Zeichen entfernen (außer '-')
        .replace(/--+/g, '-') // Mehrfache '-' durch einen ersetzen
        .replace(/^-+/, '') // Führende '-' entfernen
        .replace(/-+$/, ''); // Nachfolgende '-' entfernen
}
