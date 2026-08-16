import React from 'react';

// Comprehensive allergen dictionaries sorted by length (longer phrases matched first to avoid partial word collisions)
const ALLERGEN_TERMS_DE = [
    'magermilchpulver', 'vollmilchpulver', 'peynir altı suyu tozu', 'molkenpulver', 'milchprodukte',
    'schalenfrüchte', 'hühnereiweiß', 'gerstenmalz', 'weizenstärke', 'sojalecithin', 'sesamsamen',
    'weizenmehl', 'erdnüsse', 'haselnüsse', 'pistazien', 'walnüsse', 'cashewnüsse', 'pekannüsse',
    'milchzucker', 'sojabohnen', 'sojamehl', 'erdnuss', 'haselnuss', 'mandel', 'mandeln', 'pistazie',
    'walnuss', 'laktose', 'gluten', 'weizen', 'gerste', 'hafer', 'roggen', 'dinkel', 'soja', 'eigelb',
    'eier', 'milch', 'sesam', 'sellerie', 'senf', 'lupinen', 'sulfite', 'schwefeldioxid', 'ei', 'fisch'
];

const ALLERGEN_TERMS_TR = [
    'yağsız süt tozu', 'tam yağlı süt tozu', 'peynir altı suyu tozu', 'kabuklu yemişler', 'soya lesitini',
    'antep fıstığı', 'buğday nişastası', 'kükürt dioksit', 'susam tohumu', 'süt ürünleri', 'yumurta akı',
    'yumurta sarısı', 'arpa maltı', 'buğday unu', 'yer fıstığı', 'fındık', 'badem', 'ceviz', 'kaju',
    'pekan cevizi', 'süt tozu', 'soya fasulyesi', 'soya unu', 'yumurta', 'gluten', 'buğday', 'arpa',
    'yulaf', 'çavdar', 'laktoz', 'soya', 'süt', 'susam', 'kereviz', 'hardal', 'acı bakla', 'sülfit', 'balık'
];

const ALLERGEN_TERMS_EN = [
    'skimmed milk powder', 'whole milk powder', 'whey powder', 'dairy products', 'sesame seeds',
    'wheat flour', 'wheat starch', 'soy lecithin', 'barley malt', 'tree nuts', 'egg white',
    'egg yolk', 'milk powder', 'hazelnuts', 'pistachios', 'peanuts', 'almonds', 'walnuts', 'cashews',
    'soybeans', 'soy flour', 'lactose', 'gluten', 'wheat', 'barley', 'oats', 'rye', 'soya', 'soy',
    'milk', 'eggs', 'egg', 'sesame', 'celery', 'mustard', 'lupin', 'sulphites', 'sulfites', 'fish'
];

const ALL_TERMS = Array.from(new Set([...ALLERGEN_TERMS_DE, ...ALLERGEN_TERMS_TR, ...ALLERGEN_TERMS_EN]))
    .sort((a, b) => b.length - a.length);

/**
 * Highlights allergens in ingredient text by rendering them in UPPERCASE, BOLD, and ITALIC
 * in compliance with EU LMIV (Lebensmittelinformationsverordnung / Food Information Regulation).
 */
export function formatLmivIngredients(text: string): React.ReactNode {
    if (!text || typeof text !== 'string') return null;

    // Create a regular expression matching whole allergen terms (case-insensitive)
    const pattern = new RegExp(`\\b(${ALL_TERMS.join('|')})\\b`, 'gi');

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const matchIndex = match.index;
        const matchedText = match[0];

        // Push text preceding the allergen
        if (matchIndex > lastIndex) {
            parts.push(text.substring(lastIndex, matchIndex));
        }

        // Render allergen in Bold, Italic, Uppercase with subtle highlight
        parts.push(
            <strong
                key={matchIndex}
                className="font-bold italic uppercase text-slate-900 tracking-wide bg-amber-100/60 px-1 py-0.5 rounded-sm"
            >
                {matchedText}
            </strong>
        );

        lastIndex = matchIndex + matchedText.length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}
