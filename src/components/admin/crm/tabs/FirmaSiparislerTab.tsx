'use client';

import React from 'react';
import Link from 'next/link';
import { FiPackage, FiPlus, FiClock, FiCheckCircle, FiTruck, FiXCircle } from 'react-icons/fi';

const STATUS_CHIP: Record<string, string> = {
    'Beklemede': 'bg-amber-100 text-amber-800 border-amber-200',
    'Hazırlanıyor': 'bg-blue-100 text-blue-800 border-blue-200',
    'processing': 'bg-blue-100 text-blue-800 border-blue-200',
    'Yola Çıktı': 'bg-violet-100 text-violet-800 border-violet-200',
    'shipped': 'bg-violet-100 text-violet-800 border-violet-200',
    'Teslim Edildi': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'delivered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'İptal Edildi': 'bg-red-100 text-red-800 border-red-200',
    'cancelled': 'bg-red-100 text-red-800 border-red-200',
};

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

interface FirmaSiparislerTabProps {
    siparisler: any[];
    firmaId: string;
    locale: string;
    isPortal?: boolean;
}

export function FirmaSiparislerTab({
    siparisler,
    firmaId,
    locale,
    isPortal = false,
}: FirmaSiparislerTabProps) {
    const newOrderHref = isPortal
        ? `/${locale}/portal/siparisler/yeni?firma_id=${firmaId}`
        : `/${locale}/admin/crm/firmalar/${firmaId}/siparisler/yeni`;

    return (
        <div className="space-y-4">
            {/* Üst Bar: Başlık & Yeni Sipariş Butonu */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <FiPackage className="text-blue-600" /> Sipariş Geçmişi & Hareketleri
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Müşteriye ait tüm geçmiş ve aktif siparişler</p>
                </div>
                <Link
                    href={newOrderHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                >
                    <FiPlus size={14} /> Yeni Sipariş Gir
                </Link>
            </div>

            {/* Tablo */}
            {siparisler.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                    Bu müşteriye ait kayıtlı sipariş bulunmuyor.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Sipariş No</th>
                                <th className="px-4 py-3">Tarih</th>
                                <th className="px-4 py-3">Durum</th>
                                <th className="px-4 py-3 text-right">Net Tutar</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {siparisler.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                                        #{s.id.slice(0, 8).toUpperCase()}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {s.siparis_tarihi ? new Date(s.siparis_tarihi).toLocaleDateString('tr-TR') : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CHIP[s.siparis_durumu] || 'bg-slate-100 text-slate-600'}`}>
                                            {s.siparis_durumu}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                                        {fmt(s.toplam_tutar_net || s.toplam_tutar_brut)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={isPortal ? `/${locale}/portal/siparisler/${s.id}` : `/${locale}/admin/operasyon/siparisler/${s.id}`}
                                            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                        >
                                            İncele ➔
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
