'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface SubeFirma {
    id: string;
    unvan: string;
    sehir: string | null;
    ilce: string | null;
}

interface Props {
    count: number;
    locale: string;
    subeler: SubeFirma[];
}

export default function FirmaChainBadge({ count, locale, subeler }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors cursor-pointer"
            >
                ⛓ Zincir · {count} şube
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        Şubeler ({count})
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {subeler.map(s => (
                            <Link
                                key={s.id}
                                href={`/${locale}/admin/crm/firmalar/${s.id}`}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                                <span className="text-sm text-slate-700 truncate font-medium">{s.unvan}</span>
                                {(s.ilce || s.sehir) && (
                                    <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                                        {s.ilce || s.sehir}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
