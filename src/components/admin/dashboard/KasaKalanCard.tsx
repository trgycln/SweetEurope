'use client';

import { useState, useTransition } from 'react';
import { FiEdit2, FiCheck, FiLoader } from 'react-icons/fi';
import { savePricingDefaultsAction } from '@/app/actions/system-settings-actions';
import { toast } from 'sonner';

interface Props { initialValue: number; locale: string; }

export default function KasaKalanCard({ initialValue, locale }: Props) {
    const [editing, setEditing] = useState(false);
    const [value, setValue]     = useState(initialValue);
    const [input, setInput]     = useState(String(initialValue));
    const [pending, startT]     = useTransition();

    function save() {
        const n = parseFloat(input.replace(',', '.'));
        if (!Number.isFinite(n)) { toast.error('Geçerli bir değer girin.'); return; }
        startT(async () => {
            const res = await savePricingDefaultsAction({ kasa_bakiyesi: n }, locale);
            if (res.success) { setValue(n); setEditing(false); toast.success('Kasa bakiyesi güncellendi.'); }
            else toast.error(res.error ?? 'Hata');
        });
    }

    const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kasada Kalan</p>
            {editing ? (
                <div className="flex items-center gap-2 mt-1">
                    <input
                        type="number" step="0.01"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        autoFocus
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <button type="button" onClick={save} disabled={pending}
                        className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50">
                        {pending ? <FiLoader size={16} className="animate-spin" /> : <FiCheck size={16} />}
                    </button>
                </div>
            ) : (
                <div className="flex items-end justify-between mt-1">
                    <p className="text-2xl font-bold text-slate-800">{fmt(value)}</p>
                    <button type="button" onClick={() => { setInput(String(value)); setEditing(true); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <FiEdit2 size={14} />
                    </button>
                </div>
            )}
            <p className="text-[11px] text-slate-400">Manuel giriş · sistem ayarına kaydedilir</p>
        </div>
    );
}
