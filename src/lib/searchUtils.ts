// src/lib/searchUtils.ts
// Diakritik-duyarsız, çoklu-dil destekli arama yardımcıları.
// ı → i, ü → u, ö → o, ş → s, ç → c, ğ → g, ä → a, ö → o, ü → u, ß → ss, é → e, vs.

/**
 * Bir metni "arama formuna" çevirir:
 * - Küçük harf
 * - Diakritikler kaldırılır (ı→i, ş→s, ö→o, ü→u, ç→c, ğ→g, ß→ss, ä→a, é→e ...)
 * - Trim
 *
 * Eşleştirme her zaman normalize(needle) ⊂ normalize(haystack) şeklinde yapılır.
 */
export function normalizeSearchText(input: string | null | undefined): string {
    if (!input) return '';

    return input
        .toLowerCase()
        // Türkçe özel haritalar (toLowerCase tek başına bunları idare edemez bazı locale'lerde)
        .replace(/ı/g, 'i')
        .replace(/i̇/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        // Almanca özel: ß
        .replace(/ß/g, 'ss')
        // Genel diakritik temizleme: é, è, ê, à, ç, ñ, ä, ö, ü, ...
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();
}

/**
 * needle metni haystack içinde geçiyor mu — diakritik-duyarsız.
 * Boş needle daima true döner.
 */
export function matchesSearch(haystack: string | null | undefined, needle: string | null | undefined): boolean {
    const n = normalizeSearchText(needle);
    if (!n) return true;
    const h = normalizeSearchText(haystack);
    return h.includes(n);
}

/**
 * Birden fazla alanın herhangi birinde geçiyorsa true döner.
 * fields'a string | null | undefined geçilebilir, JSON multi-locale alanlar için
 * önce extractMultilingual ile düzleştir.
 */
export function matchesAnyField(fields: (string | null | undefined)[], needle: string | null | undefined): boolean {
    const n = normalizeSearchText(needle);
    if (!n) return true;
    for (const f of fields) {
        if (!f) continue;
        if (normalizeSearchText(f).includes(n)) return true;
    }
    return false;
}

/**
 * Multilingual JSON alanları (ör. { de: 'Schokolade', tr: 'Çikolata', en: 'Chocolate' })
 * tüm değerleri bir string array'e çevirir. Aramada her dile bakılır.
 * Plain string'leri de tek elemanlı dizi olarak döndürür.
 * null/undefined/boş objelerden temiz array döner.
 */
export function extractMultilingual(value: unknown): string[] {
    if (value == null) return [];
    if (typeof value === 'string') return [value];
    if (typeof value === 'object') {
        const out: string[] = [];
        for (const v of Object.values(value as Record<string, unknown>)) {
            if (typeof v === 'string' && v.trim()) out.push(v);
            else if (v && typeof v === 'object') out.push(...extractMultilingual(v));
        }
        return out;
    }
    return [];
}

/**
 * Server-side (Supabase / Postgres) diakritik-duyarsız arama için
 * `~*` operatörüne uygun regex pattern üretir.
 *
 * Örn. "Cikolata" → "[CÇcç][iıİI][kK][oöOÖ][lL][aäâAÄÂ][tT][aäâAÄÂ]"
 * Böylece Postgres `ilike` yerine `.filter('alan', '~*', pattern)` ile çoklu dil
 * karakter varyantları yakalanır.
 *
 * Boş/null girdi için boş string döner — çağıran tarafın filtre uygulamaması gerek.
 */
export function buildLoosePostgresRegex(needle: string | null | undefined): string {
    if (!needle) return '';
    // Önce normalize edip basit form al
    const lowered = needle.toLowerCase();
    // Her karakteri karakter sınıfına çevir (Türkçe + Almanca + diakritik varyantlar)
    return [...lowered].map(ch => {
        if ('iıİI'.includes(ch)) return '[iıİI]';
        if ('uüÜU'.includes(ch)) return '[uüÜU]';
        if ('oöÖO'.includes(ch)) return '[oöÖO]';
        if ('sşŞSß'.includes(ch)) return '(?:[sşŞS]|ss)';
        if ('cçÇC'.includes(ch)) return '[cçÇC]';
        if ('gğĞG'.includes(ch)) return '[gğĞG]';
        if ('aäâÄÂA'.includes(ch)) return '[aäâÄÂA]';
        if ('eéèêEÉÈÊ'.includes(ch)) return '[eéèêEÉÈÊ]';
        if ('nñÑN'.includes(ch)) return '[nñÑN]';
        // Regex özel karakterlerini escape et
        if ('.^$|+*?()[]{}\\'.includes(ch)) return '\\' + ch;
        return ch;
    }).join('');
}
