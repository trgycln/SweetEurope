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


// ─── Arama yardımcıları: Türkçe karakter bağımsız arama ──────────────────────

/** Türkçe/Almanca karakterleri ASCII karşılıklarına dönüştürür (arama normalizasyonu) */
export function normalizeForSearch(str: string): string {
    return str
        .toLowerCase()
        .replace(/[çÇ]/g, 'c')
        .replace(/[ğĞ]/g, 'g')
        .replace(/[ıİ]/g, 'i')
        .replace(/[şŞ]/g, 's')
        .replace(/[öÖ]/g, 'o')
        .replace(/[üÜ]/g, 'u')
        .replace(/[âÂ]/g, 'a')
        .replace(/[îÎ]/g, 'i')
        .replace(/[ûÛ]/g, 'u')
        .replace(/[äÄ]/g, 'a')
        .replace(/[ëË]/g, 'e')
        .replace(/[ïÏ]/g, 'i')
        .replace(/[ß]/g, 'ss');
}

/**
 * Bir ürünün JSONB `ad` alanındaki tüm dilleri birleştirerek arama metni oluşturur.
 * Sonuç normalize edilmiş (aksansız küçük harf) biçimdedir.
 */
export function buildProductSearchText(ad: any): string {
    if (!ad) return '';
    if (typeof ad === 'string') return normalizeForSearch(ad);
    return normalizeForSearch(
        Object.values(ad as Record<string, string>)
            .filter(Boolean)
            .join(' ')
    );
}

/**
 * Sunucu tarafı Supabase sorgularında Türkçe karakter bağımsız arama için
 * `or()` filtre stringi üretir. Tüm diller (tr, de, en, ar) ve stok_kodu dahildir.
 */
export function buildSupabaseSearchFilter(rawQuery: string): string {
    const escaped = rawQuery.replace(/[%_]/g, (c) => `\\${c}`);  // LIKE özel karakterleri kaç
    const normalized = normalizeForSearch(rawQuery).replace(/[%_]/g, (c) => `\\${c}`);

    // ASCII karakterlerin Türkçe karşılıkları (c→ç, g→ğ, s→ş, o→ö, u→ü, i→ı)
    const CHAR_MAP: Record<string, string> = {
        'c': 'ç', 'g': 'ğ', 's': 'ş', 'o': 'ö', 'u': 'ü', 'i': 'ı',
    };
    const turkified = normalized.split('').map((c) => CHAR_MAP[c] ?? c).join('');

    // En fazla 3 benzersiz pattern: orijinal, normalize, Türkçe genişletilmiş
    const pats = [...new Set([escaped, normalized, turkified !== normalized ? turkified : null].filter(Boolean) as string[])];
    const langs = ['tr', 'de', 'en', 'ar'];

    const parts: string[] = [];
    for (const pat of pats) {
        for (const lang of langs) {
            parts.push(`ad->>${lang}.ilike.%${pat}%`);
        }
        parts.push(`stok_kodu.ilike.%${pat}%`);
    }
    return parts.join(',');
}

// ─────────────────────────────────────────────────────────────────────────────

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
