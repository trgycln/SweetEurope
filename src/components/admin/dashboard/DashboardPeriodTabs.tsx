'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const TABS = [
    { key: 'bu-ay',     label: 'Bu Ay' },
    { key: 'gecen-ay',  label: 'Geçen Ay' },
    { key: 'bu-yil',    label: 'Bu Yıl (YTD)' },
] as const;

export default function DashboardPeriodTabs() {
    const params   = useSearchParams();
    const pathname = usePathname();
    const router   = useRouter();
    const current  = params.get('period') ?? 'bu-ay';

    function go(key: string) {
        const sp = new URLSearchParams(params.toString());
        sp.set('period', key);
        router.replace(`${pathname}?${sp.toString()}`);
    }

    return (
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit">
            {TABS.map(t => (
                <button
                    key={t.key}
                    type="button"
                    onClick={() => go(t.key)}
                    className={[
                        'px-4 py-1.5 text-sm font-semibold rounded-lg transition-all',
                        current === t.key
                            ? 'bg-white shadow-sm text-slate-900'
                            : 'text-slate-500 hover:text-slate-700',
                    ].join(' ')}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}
