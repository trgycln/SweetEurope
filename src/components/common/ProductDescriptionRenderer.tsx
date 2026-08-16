'use client';

import React, { useMemo } from 'react';
import {
    LuSparkles,
    LuCheck,
    LuLayers,
    LuCoffee,
    LuBookOpen,
    LuInfo,
    LuListChecks
} from 'react-icons/lu';

interface ProductDescriptionRendererProps {
    text: string | null | undefined;
    productTitle?: string;
    locale?: string;
    className?: string;
}

type SectionType = 'highlights' | 'applications' | 'preparation' | 'features' | 'storage' | 'general' | 'keyValueList';

interface ParsedSection {
    type: SectionType;
    title: string;
    items: string[];
    keyValues?: { key: string; val: string }[];
}

interface ParsedDescription {
    leadParagraphs: string[];
    sections: ParsedSection[];
    trailingParagraphs: string[];
}

// Regex patterns to identify bullet points
const BULLET_REGEX = /^[\s\t]*([–—\-•*+✓✔▪▫]\s*|\d+[.)]\s*|\([0-9a-zA-Z]\)\s*)(.*)$/;

// Helper to determine section category by title keywords
function categorizeSectionTitle(title: string): SectionType {
    const t = title.toLowerCase().trim();

    // Highlights / Öne Çıkanlar / Vorteile
    if (
        t.includes('höhepunkte') ||
        t.includes('highlights') ||
        t.includes('vorteile') ||
        t.includes('öne çıkan') ||
        t.includes('avantajlar') ||
        t.includes('özellikler') ||
        t.includes('key features') ||
        t.includes('benefits') ||
        t.includes('besonderheiten')
    ) {
        return 'highlights';
    }

    // Einsatzgebiete / Anwendungsbereiche / Kullanım Alanları / Applications
    if (
        t.includes('einsatzgebiete') ||
        t.includes('anwendungsbereiche') ||
        t.includes('anwendung') ||
        t.includes('kullanım alan') ||
        t.includes('uygulama alan') ||
        t.includes('nerelerde kullanılır') ||
        t.includes('applications') ||
        t.includes('areas of use') ||
        t.includes('uses') ||
        t.includes('servierempfehlung') ||
        t.includes('verwendung')
    ) {
        return 'applications';
    }

    // Zubereitung / Hazırlanışı / Preparation / Dosierung
    if (
        t.includes('zubereitung') ||
        t.includes('hazırlanış') ||
        t.includes('kullanım şekli') ||
        t.includes('tarif') ||
        t.includes('preparation') ||
        t.includes('instructions') ||
        t.includes('how to use') ||
        t.includes('dosierung') ||
        t.includes('rezept') ||
        t.includes('mischverhältnis')
    ) {
        return 'preparation';
    }

    // Storage / Saklama Koşulları / Lagerung
    if (
        t.includes('lagerung') ||
        t.includes('saklama') ||
        t.includes('aufbewahrung') ||
        t.includes('storage') ||
        t.includes('haltbarkeit')
    ) {
        return 'storage';
    }

    // Features / Ürün Özellikleri / Produktmerkmale
    if (
        t.includes('merkmale') ||
        t.includes('eigenschaften') ||
        t.includes('ürün özellikleri') ||
        t.includes('features') ||
        t.includes('profil') ||
        t.includes('geschmack') ||
        t.includes('aroma')
    ) {
        return 'features';
    }

    return 'general';
}

function isPotentialSectionHeader(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 70) return false;

    // Ends with a colon
    if (trimmed.endsWith(':')) return true;

    // Matches known section keywords
    const lower = trimmed.toLowerCase();
    const keywords = [
        'einsatzgebiete', 'anwendungsbereiche', 'anwendungsgebiete', 'anwendung',
        'höhepunkte', 'vorteile', 'produktmerkmale', 'eigenschaften', 'besonderheiten',
        'kullanım alanları', 'uygulama alanları', 'öne çıkanlar', 'avantajlar', 'özellikler',
        'hazırlanışı', 'kullanım şekli', 'tarif', 'zubereitung', 'dosierung',
        'highlights', 'applications', 'key features', 'features', 'benefits', 'preparation',
        'geschmacksprofil', 'aroma & geschmack', 'lezzet profili', 'lagerung & haltbarkeit',
        'lagerung', 'aufbewahrung', 'saklama koşulları', 'wichtige hinweise', 'hinweise', 'notlar'
    ];

    if (keywords.some(k => lower === k || lower.startsWith(k + ':') || lower.startsWith(k + ' -'))) {
        return true;
    }

    // Short standalone line (<= 35 chars) with no period at end, capitalized start
    if (trimmed.length <= 35 && !trimmed.endsWith('.') && !trimmed.endsWith(',') && !trimmed.includes(';')) {
        return true;
    }

    return false;
}

export function parseProductDescription(rawText: string, productTitle?: string): ParsedDescription {
    // Normalize newlines and replace HTML line breaks
    const normalized = rawText
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();

    const rawLines = normalized.split(/\r?\n/).map(l => l.trim());
    
    // Clean and filter empty lines while keeping block structure
    const lines: string[] = [];
    for (const line of rawLines) {
        if (line) lines.push(line);
    }

    const leadParagraphs: string[] = [];
    const sections: ParsedSection[] = [];
    const trailingParagraphs: string[] = [];

    if (lines.length === 0) {
        return { leadParagraphs, sections, trailingParagraphs };
    }

    // Check if line 0 is a duplicate or near-duplicate of product title
    let startIndex = 0;
    const normTitle = (productTitle || '').toLowerCase().trim();
    if (lines.length > 1) {
        const firstLineNorm = lines[0].toLowerCase().trim();
        if (
            normTitle &&
            (firstLineNorm === normTitle ||
             firstLineNorm.includes(normTitle) ||
             normTitle.includes(firstLineNorm)) &&
            firstLineNorm.length <= normTitle.length + 30
        ) {
            // Skip title repeat if second line is also descriptive
            startIndex = 1;
        }
    }

    let currentSection: ParsedSection | null = null;
    let hasFoundFirstSection = false;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const bulletMatch = line.match(BULLET_REGEX);

        if (isPotentialSectionHeader(line) && !bulletMatch) {
            // Save previous section if exists
            if (currentSection) {
                if (currentSection.items.length > 0 || (currentSection.keyValues && currentSection.keyValues.length > 0)) {
                    sections.push(currentSection);
                }
            }
            const cleanTitle = line.replace(/[:]+$/, '').trim();
            const sectionType = categorizeSectionTitle(cleanTitle);
            currentSection = {
                type: sectionType,
                title: cleanTitle,
                items: []
            };
            hasFoundFirstSection = true;
            continue;
        }

        if (bulletMatch) {
            const itemText = bulletMatch[2].trim();
            if (itemText) {
                if (!currentSection) {
                    // If bullets appear before any header, create a general highlights/features section
                    currentSection = {
                        type: 'highlights',
                        title: '',
                        items: []
                    };
                    hasFoundFirstSection = true;
                }
                currentSection.items.push(itemText);
            }
            continue;
        }

        // Regular line without bullet
        if (currentSection) {
            // If the section already has items, a new non-bullet line might be a continuation or trailing paragraph
            if (currentSection.items.length > 0 && line.length > 60) {
                // If it's a long sentence, close the section and treat as trailing text
                sections.push(currentSection);
                currentSection = null;
                trailingParagraphs.push(line);
            } else if (currentSection.items.length === 0) {
                // Intro item of the section
                currentSection.items.push(line);
            } else {
                currentSection.items.push(line);
            }
        } else {
            if (!hasFoundFirstSection) {
                leadParagraphs.push(line);
            } else {
                trailingParagraphs.push(line);
            }
        }
    }

    if (currentSection && (currentSection.items.length > 0 || (currentSection.keyValues && currentSection.keyValues.length > 0))) {
        sections.push(currentSection);
    }

    return { leadParagraphs, sections, trailingParagraphs };
}

export function ProductDescriptionRenderer({
    text,
    productTitle,
    locale = 'de',
    className = ''
}: ProductDescriptionRendererProps) {
    if (!text || typeof text !== 'string' || text === 'Unbenannt' || text.trim() === '') {
        return null;
    }

    const parsed = useMemo(() => {
        return parseProductDescription(text, productTitle);
    }, [text, productTitle]);

    const hasStructuredSections = parsed.sections.length > 0;
    const hasLead = parsed.leadParagraphs.length > 0;
    const hasTrailing = parsed.trailingParagraphs.length > 0;

    // Fallback: If no structured sections or leads were parsed (e.g. single short text)
    if (!hasStructuredSections && !hasLead && !hasTrailing) {
        return (
            <div className={`text-sm text-slate-600 leading-relaxed ${className}`}>
                {text}
            </div>
        );
    }

    return (
        <div className={`space-y-4 text-slate-700 ${className}`}>
            {/* ── Lead Paragraphs (Intro Story / Description) ── */}
            {hasLead && (
                <div className="space-y-2.5">
                    {parsed.leadParagraphs.map((para, idx) => (
                        <p
                            key={idx}
                            className="text-sm text-slate-600 leading-relaxed font-normal"
                        >
                            {para}
                        </p>
                    ))}
                </div>
            )}

            {/* ── Structured Sections Grid / Stack ── */}
            {hasStructuredSections && (
                <div className="grid grid-cols-1 gap-3 pt-1">
                    {parsed.sections.map((section, idx) => {
                        // 1. Highlights / Höhepunkte / Vorteile
                        if (section.type === 'highlights') {
                            return (
                                <div
                                    key={idx}
                                    className="rounded-xl p-4 bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-orange-50/30 border border-amber-200/80 shadow-xs transition-all hover:border-amber-300"
                                >
                                    {section.title && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-lg bg-amber-100/90 text-amber-700 flex items-center justify-center shadow-xs">
                                                <LuSparkles size={13} />
                                            </div>
                                            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                                                {section.title}
                                            </h4>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {section.items.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2 text-xs text-amber-950/90 bg-white/80 rounded-lg p-2.5 border border-amber-100/70 shadow-xs"
                                            >
                                                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
                                                    <LuCheck size={10} strokeWidth={3} />
                                                </span>
                                                <span className="leading-snug font-medium flex-1">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // 2. Einsatzgebiete / Applications / Anwendungsbereiche
                        if (section.type === 'applications') {
                            return (
                                <div
                                    key={idx}
                                    className="rounded-xl p-4 bg-gradient-to-br from-sky-50/80 via-slate-50/60 to-blue-50/30 border border-sky-200/80 shadow-xs transition-all hover:border-sky-300"
                                >
                                    {section.title && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-lg bg-sky-100/90 text-sky-700 flex items-center justify-center shadow-xs">
                                                <LuCoffee size={13} />
                                            </div>
                                            <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                                                {section.title}
                                            </h4>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {section.items.map((item, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/90 text-sky-900 border border-sky-200/80 shadow-xs"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // 3. Zubereitung / Preparation / Recipe
                        if (section.type === 'preparation') {
                            return (
                                <div
                                    key={idx}
                                    className="rounded-xl p-4 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50/40 border border-emerald-200/80 shadow-xs transition-all hover:border-emerald-300"
                                >
                                    {section.title && (
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-xs">
                                                <LuBookOpen size={13} />
                                            </div>
                                            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                                                {section.title}
                                            </h4>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        {section.items.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2.5 text-xs text-emerald-950/90 bg-white/80 rounded-lg p-2.5 border border-emerald-100/70"
                                            >
                                                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                                    {i + 1}
                                                </span>
                                                <span className="leading-snug font-medium pt-0.5">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        // 4. Features / Storage / General Bullet List
                        return (
                            <div
                                key={idx}
                                className="rounded-xl p-4 bg-slate-50/80 border border-slate-200/80 shadow-xs"
                            >
                                {section.title && (
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-5 h-5 rounded-md bg-slate-200/80 text-slate-700 flex items-center justify-center">
                                            <LuListChecks size={12} />
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                            {section.title}
                                        </h4>
                                    </div>
                                )}
                                <ul className="space-y-1.5">
                                    {section.items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2 text-xs text-slate-700 font-medium"
                                        >
                                            <span className="text-slate-400 mt-0.5">•</span>
                                            <span className="leading-snug">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Trailing Paragraphs / Notes ── */}
            {hasTrailing && (
                <div className="space-y-2 pt-1">
                    {parsed.trailingParagraphs.map((para, idx) => (
                        <p
                            key={idx}
                            className="text-xs text-slate-500 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100"
                        >
                            {para}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ProductDescriptionRenderer;
