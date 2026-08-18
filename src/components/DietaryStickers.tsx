import React from 'react';
import Image from 'next/image';

// ── Image Sticker Definitions (Existing in /public/images/) ──────────────────
export const DIETARY_IMAGE_CONFIG = [
    { key: 'vegan',       title: 'Vegan',       src: '/images/vegan_etiket.png' },
    { key: 'laktosefrei', title: 'Laktosefrei', src: '/images/laktosefrei_etiket.png' },
    { key: 'glutenfrei',  title: 'Glutenfrei',  src: '/images/glutenfrei_etiket.png' },
    { key: 'ohne_zucker', title: 'Zuckerfrei',  src: '/images/zuckerfrei_etiket.png' },
] as const;

// ── Non-image feature badges (rendered as text pills) ────────────────────────
export const OTHER_FEATURE_BADGES = [
    { key: 'bio',      short: 'Bio',  icon: '🍃', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { key: 'katkisiz', short: 'Rein', icon: '✨', bg: 'bg-teal-50 text-teal-800 border-teal-200' },
] as const;

export const ZERTIFIKAT_BADGES: Record<string, { label: string; bg: string }> = {
    'Halal':      { label: 'Halal',     bg: 'bg-teal-50 text-teal-800 border-teal-300' },
    'Bio':        { label: 'Bio ✓',    bg: 'bg-green-50 text-green-800 border-green-300' },
    'IFS':        { label: 'IFS',       bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    'BRC':        { label: 'BRC',       bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    'Kosher':     { label: 'Kosher',    bg: 'bg-purple-50 text-purple-800 border-purple-200' },
    'HACCP':      { label: 'HACCP',     bg: 'bg-slate-100 text-slate-700 border-slate-300' },
    'Vegan_Zert': { label: 'Vegan ✓',  bg: 'bg-green-50 text-green-800 border-green-300' },
    'Rainforest': { label: 'Rainforest',bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

export function isFeatureActive(key: string, tekniks?: Record<string, unknown> | null): boolean {
    if (!tekniks) return false;
    const v = tekniks[key];
    if (v === true || v === 'true' || v === 'evet' || v === 1) return true;
    if (key === 'ohne_zucker') {
        const vz = tekniks.zuckerfrei;
        if (vz === true || vz === 'true' || vz === 'evet' || vz === 1) return true;
    }
    return false;
}

// ── Combined Badges Component for Product Cards (Bottom text section) ────────
interface ProductDietaryBadgesProps {
    teknikOzellikler?: Record<string, unknown> | null;
    zertifikate?: string[] | null;
    className?: string;
    size?: 'xs' | 'sm' | 'md';
}

export function ProductDietaryBadges({
    teknikOzellikler,
    zertifikate,
    className = '',
    size = 'sm',
}: ProductDietaryBadgesProps) {
    const tekniks = (teknikOzellikler || {}) as Record<string, unknown>;

    const activeImageBadges = DIETARY_IMAGE_CONFIG.filter(b => isFeatureActive(b.key, tekniks));
    const activeTextBadges = OTHER_FEATURE_BADGES.filter(b => isFeatureActive(b.key, tekniks));
    const activeZertifikate = (zertifikate || [])
        .filter(z => z !== 'BRC' && z !== 'Halal' && ZERTIFIKAT_BADGES[z])
        .map(z => ZERTIFIKAT_BADGES[z]);

    if (activeImageBadges.length === 0 && activeTextBadges.length === 0 && activeZertifikate.length === 0) {
        return null;
    }

    const sizeClasses = {
        xs: 'w-5 h-5',
        sm: 'w-6 h-6',
        md: 'w-7 h-7',
    }[size];

    return (
        <div className={`flex flex-wrap items-center gap-1.5 min-h-[24px] ${className}`}>
            {/* Image Stickers for Vegan, Laktosefrei, Glutenfrei, Zuckerfrei */}
            {activeImageBadges.map(badge => (
                <div
                    key={badge.key}
                    className={`relative ${sizeClasses} rounded-full overflow-hidden bg-white shrink-0 shadow-xs border border-gray-100 hover:scale-110 transition-transform duration-200`}
                    title={badge.title}
                >
                    <Image
                        src={badge.src}
                        alt={badge.title}
                        fill
                        sizes="32px"
                        className="object-contain"
                        unoptimized
                    />
                </div>
            ))}

            {/* Other text badges (e.g. Bio, Rein) */}
            {activeTextBadges.map(b => (
                <span
                    key={b.key}
                    className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${b.bg}`}
                >
                    <span>{b.icon}</span>
                    <span>{b.short}</span>
                </span>
            ))}

            {/* Certificate text badges */}
            {activeZertifikate.map((cert, idx) => (
                <span
                    key={idx}
                    className={`inline-flex items-center text-[9.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${cert.bg}`}
                >
                    {cert.label}
                </span>
            ))}
        </div>
    );
}

export const DietaryBadgeList = ProductDietaryBadges;

// ── Legacy Floating Sticker Component (kept for backwards compatibility) ────
interface DietaryStickersProps {
    teknikOzellikler?: Record<string, unknown> | null;
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function DietaryStickers({ teknikOzellikler, className = '', size = 'sm' }: DietaryStickersProps) {
    if (!teknikOzellikler) return null;

    const activeBadges = DIETARY_IMAGE_CONFIG.filter(b => isFeatureActive(b.key, teknikOzellikler as any));
    if (activeBadges.length === 0) return null;

    const sizeClasses = {
        xs: 'w-5 h-5',
        sm: 'w-6 h-6 sm:w-7 sm:h-7',
        md: 'w-8 h-8 sm:w-9 sm:h-9',
        lg: 'w-10 h-10 sm:w-12 sm:h-12',
    }[size];

    return (
        <div className={`flex items-center gap-1 z-10 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] ${className}`}>
            {activeBadges.map(b => (
                <div
                    key={b.key}
                    className={`relative ${sizeClasses} rounded-full overflow-hidden bg-white/90 p-0.5 border border-white/80 shadow-xs flex-shrink-0`}
                    title={b.title}
                >
                    <Image
                        src={b.src}
                        alt={b.title}
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                    />
                </div>
            ))}
        </div>
    );
}
