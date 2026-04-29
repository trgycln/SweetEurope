'use client';

import { useState, useTransition } from 'react';
import { FiRefreshCw, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { stokYenidenHesaplaAction } from '@/app/actions/stok-actions';

export default function StokHesaplaButton() {
    const [isPending, startTransition] = useTransition();
    const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);

    const handleClick = () => {
        setSonuc(null);
        startTransition(async () => {
            const result = await stokYenidenHesaplaAction();
            if (result.success) {
                setSonuc({ ok: true, mesaj: result.mesaj ?? 'Stoklar güncellendi.' });
            } else {
                setSonuc({ ok: false, mesaj: result.error ?? 'Bilinmeyen hata.' });
            }
        });
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                title="Tüm ürünlerin stok miktarını TIR/parti verilerinden yeniden hesapla"
            >
                <FiRefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
                {isPending ? 'Hesaplanıyor...' : 'Stoğu Yenile'}
            </button>

            {sonuc && (
                <span className={`text-[11px] font-medium flex items-center gap-1 ${sonuc.ok ? 'text-green-700' : 'text-red-600'}`}>
                    {sonuc.ok
                        ? <FiCheckCircle size={11} />
                        : <FiAlertTriangle size={11} />
                    }
                    {sonuc.mesaj}
                </span>
            )}
        </div>
    );
}
