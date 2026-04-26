'use client';

import { useState, type ReactNode } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface Props {
    dot: string;                  // Tailwind class, e.g. "bg-red-500"
    title: string;
    meta?: string;
    links?: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}

export default function CollapsibleSection({ dot, title, meta, links, defaultOpen = true, children }: Props) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                    <h2 className="text-[15px] font-bold text-slate-800 whitespace-nowrap">{title}</h2>
                    {meta && (
                        <span className="text-[12px] text-slate-500 truncate hidden sm:block">· {meta}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {links}
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-expanded={open}
                    >
                        <FiChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div
                className="transition-[max-height,opacity] duration-200 ease-in-out overflow-hidden"
                style={{ maxHeight: open ? '9999px' : '0', opacity: open ? 1 : 0 }}
            >
                <div className="border-t border-slate-100 p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}
