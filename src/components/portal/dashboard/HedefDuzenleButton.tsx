'use client';

import { useState, useTransition } from 'react';
import { FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import { saveBayiHedefleriAction } from './hedef-actions';

type Props = {
    firmaId: string;
    locale: string;
    hedefCiro: number;
    hedefMusteri: number;
    hedefSiparis: number;
};

export function HedefDuzenleButton({ firmaId, locale, hedefCiro, hedefMusteri, hedefSiparis }: Props) {
    const [open, setOpen] = useState(false);
    const [ciro, setCiro] = useState(String(hedefCiro));
    const [musteri, setMusteri] = useState(String(hedefMusteri));
    const [siparis, setSiparis] = useState(String(hedefSiparis));
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleOpen = () => {
        setCiro(String(hedefCiro));
        setMusteri(String(hedefMusteri));
        setSiparis(String(hedefSiparis));
        setError(null);
        setSuccess(false);
        setOpen(true);
    };

    const handleClose = () => {
        if (isPending) return;
        setOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const payload = {
            hedef_ciro: Number(ciro),
            hedef_musteri: Number(musteri),
            hedef_siparis: Number(siparis),
        };

        startTransition(async () => {
            const res = await saveBayiHedefleriAction(firmaId, payload, locale);
            if (res.success) {
                setSuccess(true);
                setTimeout(() => {
                    setOpen(false);
                    setSuccess(false);
                }, 800);
            } else {
                setError(res.error || 'Bir hata oluştu');
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
                title="Hedefleri düzenle"
            >
                Hedefleri Düzenle <FiEdit2 size={9} />
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={handleClose}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800">Aylık Hedefleri Düzenle</h3>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isPending}
                                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Satış Cirosu (€)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={ciro}
                                    onChange={(e) => setCiro(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Yeni Müşteri Sayısı
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={musteri}
                                    onChange={(e) => setMusteri(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                    Sipariş Adedi
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={siparis}
                                    onChange={(e) => setSiparis(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                                    <FiCheck size={12} /> Hedefler güncellendi
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isPending}
                                    className="text-xs font-semibold text-slate-600 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
