import React from 'react';
import Image from 'next/image';

interface DietaryStickersProps {
    teknikOzellikler?: Record<string, unknown> | null;
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function DietaryStickers({ teknikOzellikler, className = '', size = 'sm' }: DietaryStickersProps) {
    if (!teknikOzellikler) return null;

    const isVegan = teknikOzellikler.vegan === true || teknikOzellikler.vegan === 'true' || teknikOzellikler.vegan === 1;
    const isLaktosefrei = teknikOzellikler.laktosefrei === true || teknikOzellikler.laktosefrei === 'true' || teknikOzellikler.laktosefrei === 1;
    const isGlutenfrei = teknikOzellikler.glutenfrei === true || teknikOzellikler.glutenfrei === 'true' || teknikOzellikler.glutenfrei === 1;
    const isZuckerfrei = teknikOzellikler.ohne_zucker === true || teknikOzellikler.ohne_zucker === 'true' || teknikOzellikler.ohne_zucker === 1 || teknikOzellikler.zuckerfrei === true;

    if (!isVegan && !isLaktosefrei && !isGlutenfrei && !isZuckerfrei) return null;

    // Previous original subtle dimensions
    const sizeClasses = {
        xs: 'w-5 h-5',
        sm: 'w-6 h-6 sm:w-7 sm:h-7',
        md: 'w-8 h-8 sm:w-9 sm:h-9',
        lg: 'w-10 h-10 sm:w-12 sm:h-12',
    }[size];

    return (
        <div className={`flex items-center gap-1 z-10 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)] ${className}`}>
            {isVegan && (
                <div className={`relative ${sizeClasses} rounded-full overflow-hidden bg-white/90 p-0.5 border border-white/80 shadow-xs flex-shrink-0`} title="Vegan">
                    <Image
                        src="/images/vegan_etiket.png"
                        alt="Vegan"
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                    />
                </div>
            )}
            {isLaktosefrei && (
                <div className={`relative ${sizeClasses} rounded-full overflow-hidden bg-white/90 p-0.5 border border-white/80 shadow-xs flex-shrink-0`} title="Laktosefrei">
                    <Image
                        src="/images/laktosefrei_etiket.png"
                        alt="Laktosefrei"
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                    />
                </div>
            )}
            {isGlutenfrei && (
                <div className={`relative ${sizeClasses} rounded-full overflow-hidden bg-white/90 p-0.5 border border-white/80 shadow-xs flex-shrink-0`} title="Glutenfrei">
                    <Image
                        src="/images/glutenfrei_etiket.png"
                        alt="Glutenfrei"
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                    />
                </div>
            )}
            {isZuckerfrei && (
                <div className={`relative ${sizeClasses} rounded-full overflow-hidden bg-white/90 p-0.5 border border-white/80 shadow-xs flex-shrink-0`} title="Zuckerfrei">
                    <Image
                        src="/images/zuckerfrei_etiket.png"
                        alt="Zuckerfrei"
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                    />
                </div>
            )}
        </div>
    );
}
