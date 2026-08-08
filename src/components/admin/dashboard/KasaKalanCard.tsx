'use client';

interface Props { initialValue: number; locale: string; }

export default function KasaKalanCard({ initialValue }: Props) {
    const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kasada Kalan (Banka + Nakit)</p>
            <div className="flex items-end justify-between mt-1">
                <p className={`text-2xl font-bold ${initialValue < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {fmt(initialValue)}
                </p>
            </div>
            <p className="text-[11px] text-slate-400">Otomatik hesaplanır</p>
        </div>
    );
}
