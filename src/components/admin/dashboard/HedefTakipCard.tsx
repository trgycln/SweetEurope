'use client';

import { useState, useTransition } from 'react';
import { FiEdit2, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { savePricingDefaultsAction } from '@/app/actions/system-settings-actions';
import { toast } from 'sonner';

type Metrik = {
    key: string;
    label: string;
    gercek: number;
    hedef: number;
    format?: 'currency' | 'number';
};

interface Props {
    metrikler: Metrik[];
    locale: string;
}

function fmtCur(n: number) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
    const w = Math.min(100, Math.max(0, pct));
    return (
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${w}%` }} />
        </div>
    );
}

function color(pct: number) {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 70)  return 'bg-blue-500';
    if (pct >= 40)  return 'bg-amber-400';
    return 'bg-red-400';
}

export default function HedefTakipCard({ metrikler, locale }: Props) {
    const [editing, setEditing] = useState(false);
    const [drafts, setDrafts]   = useState<Record<string, string>>({});
    const [pending, startT]     = useTransition();

    function startEdit() {
        const d: Record<string, string> = {};
        metrikler.forEach(m => { d[m.key] = String(m.hedef); });
        setDrafts(d);
        setEditing(true);
    }

    function save() {
        const payload: Record<string, number> = {};
        for (const [k, v] of Object.entries(drafts)) {
            const n = parseFloat(v.replace(',', '.'));
            if (Number.isFinite(n) && n >= 0) payload[k] = n;
        }
        if (Object.keys(payload).length === 0) { toast.error('Geçerli hedef değeri yok.'); return; }
        startT(async () => {
            const res = await savePricingDefaultsAction(payload, locale);
            if (res.success) { setEditing(false); toast.success('Hedefler güncellendi.'); }
            else toast.error(res.error ?? 'Hata');
        });
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aylık Hedef Takibi</p>
                {editing ? (
                    <div className="flex gap-1">
                        <button type="button" onClick={save} disabled={pending}
                            className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 text-xs flex items-center gap-1">
                            {pending ? <FiLoader size={12} className="animate-spin" /> : <FiCheck size={12} />}
                            Kaydet
                        </button>
                        <button type="button" onClick={() => setEditing(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                            <FiX size={12} />
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={startEdit}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <FiEdit2 size={13} />
                    </button>
                )}
            </div>

            {metrikler.map(m => {
                const pct = m.hedef > 0 ? Math.round((m.gercek / m.hedef) * 100) : 0;
                const c   = color(pct);
                const fmtVal = (v: number) => m.format === 'currency' ? fmtCur(v) : v.toLocaleString('tr-TR');
                return (
                    <div key={m.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">{m.label}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 70 ? 'text-blue-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                                    %{pct}
                                </span>
                                {editing ? (
                                    <input type="number" min={0}
                                        value={drafts[m.key] ?? ''}
                                        onChange={e => setDrafts(p => ({ ...p, [m.key]: e.target.value }))}
                                        className="w-24 rounded border border-slate-300 px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    />
                                ) : (
                                    <span className="text-xs text-slate-500">{fmtVal(m.gercek)} / {fmtVal(m.hedef)}</span>
                                )}
                            </div>
                        </div>
                        <ProgressBar pct={pct} color={c} />
                    </div>
                );
            })}
        </div>
    );
}
