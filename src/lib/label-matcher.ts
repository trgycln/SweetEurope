import labelFiles from './label-files.json';

export interface LabelFileItem {
    originalName: string;
    storageKey: string;
    publicUrl: string;
    rawPath?: string;
}

/**
 * Normalizes text for matching by removing special characters, spaces, and converting to lowercase.
 */
function normalizeForMatch(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/ä/g, 'a')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the closest matching PDF label file from Supabase Storage CDN
 */
export function getProductLabelPdfUrl(
    explicitUrl?: string | null,
    productName?: string | null,
    stokKodu?: string | null
): string | null {
    if (explicitUrl && explicitUrl.trim() !== '') {
        return explicitUrl;
    }

    if (!productName && !stokKodu) return null;

    const normName = productName ? normalizeForMatch(productName) : '';
    const normSku = stokKodu ? normalizeForMatch(stokKodu) : '';

    const list = labelFiles as unknown as (LabelFileItem | string)[];

    for (const item of list) {
        const isObj = typeof item === 'object' && item !== null;
        const originalName = isObj ? (item as LabelFileItem).originalName : String(item);
        const storageKey = isObj ? (item as LabelFileItem).storageKey : String(item);
        const publicUrl = isObj ? (item as LabelFileItem).publicUrl : `/${String(item).replace(/\\/g, '/')}`;

        const normFile = normalizeForMatch(originalName + ' ' + storageKey);

        // Direct SKU match
        if (normSku && (normFile.includes(normSku) || normSku.includes(normFile))) {
            return publicUrl;
        }

        // Fuzzy match product keywords
        if (normName) {
            // Check if key distinct words match
            const words = productName!
                .toLowerCase()
                .replace(/[^a-z0-9ğüşıöçäöü]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2 && !['ve', 'und', 'and', 'tozu', 'pulver', 'sos', 'sauce', 'surup', 'sirup', '1kg', 'fo'].includes(w));

            if (words.length > 0) {
                const matchedWords = words.filter(w => normFile.includes(normalizeForMatch(w)));
                if (matchedWords.length >= Math.min(2, words.length)) {
                    return publicUrl;
                }
            }
        }
    }

    return null;
}

