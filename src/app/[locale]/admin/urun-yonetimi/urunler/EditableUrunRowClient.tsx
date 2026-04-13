"use client";
import React from "react";
import Link from "next/link";
import { formatCurrency, getLocalizedName } from "@/lib/utils";
import { quickUpdateUrunAction } from "./actions";

export default function EditableUrunRowClient({ urun, locale, content, isAdmin, canSeePurchasePrice }) {
    const [alisFiyati, setAlisFiyati] = React.useState(urun.distributor_alis_fiyati ?? 0);
    const [stokMiktari, setStokMiktari] = React.useState(urun.stok_miktari ?? 0);
    const [aktif, setAktif] = React.useState(urun.aktif ?? true);
    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [error, setError] = React.useState("");

    const isDirty = alisFiyati !== (urun.distributor_alis_fiyati ?? 0)
        || stokMiktari !== (urun.stok_miktari ?? 0)
        || aktif !== (urun.aktif ?? true);

    async function handleSave() {
        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            const result = await quickUpdateUrunAction(urun.id, {
                distributor_alis_fiyati: alisFiyati,
                stok_miktari: stokMiktari,
                aktif: aktif
            });
            if (result && result.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 2000);
            } else {
                setError(result?.message || "Hata oluştu");
            }
        } catch (e: any) {
            setError("Hata: " + (e?.message || "Bilinmeyen hata"));
        }
        setLoading(false);
    }

    const urunAdi = getLocalizedName(urun.ad, locale);
    const kategoriAdi = urun.kategoriler?.ad ? getLocalizedName(urun.kategoriler.ad, locale) : '—';

    return (
        <tr className={`hover:bg-slate-50/60 transition ${isDirty ? 'bg-amber-50/40' : ''}`}>
            {/* Resim */}
            <td className="w-10 px-3 py-2">
                <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`}>
                    <div className="w-8 h-8 rounded overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        {urun.ana_resim_url
                            ? <img src={urun.ana_resim_url} alt={urunAdi} className="w-full h-full object-cover" />
                            : <span className="text-[9px] text-slate-300">img</span>
                        }
                    </div>
                </Link>
            </td>

            {/* Ürün adı + kodu */}
            <td className="px-3 py-2 max-w-[220px]">
                <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`}
                    className="font-medium text-slate-900 hover:text-slate-600 hover:underline leading-snug block truncate">
                    {urunAdi}
                </Link>
                {urun.stok_kodu && (
                    <span className="text-[11px] font-mono text-slate-400">{urun.stok_kodu}</span>
                )}
            </td>

            {/* Kategori */}
            <td className="px-3 py-2 text-xs text-slate-600 max-w-[140px]">
                <span className="truncate block">{kategoriAdi}</span>
            </td>

            {/* Stok */}
            <td className="px-3 py-2">
                {isAdmin ? (
                    <input
                        type="number"
                        className={`w-16 rounded border px-1.5 py-1 text-sm text-right ${isDirty && stokMiktari !== (urun.stok_miktari ?? 0) ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                        value={stokMiktari}
                        onChange={e => setStokMiktari(Number(e.target.value))}
                        disabled={loading}
                    />
                ) : (
                    <span className="text-sm font-medium text-slate-700">{urun.stok_miktari ?? 0}</span>
                )}
            </td>

            {/* Aktif */}
            <td className="px-3 py-2">
                {isAdmin ? (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded accent-slate-900"
                            checked={aktif} onChange={e => setAktif(e.target.checked)} disabled={loading} />
                        <span className={`text-xs font-medium ${aktif ? 'text-emerald-700' : 'text-red-600'}`}>
                            {aktif ? 'Aktif' : 'Pasif'}
                        </span>
                    </label>
                ) : (
                    <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${urun.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {urun.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                )}
            </td>

            {/* Alış fiyatı */}
            {canSeePurchasePrice && (
                <td className="px-3 py-2 text-right">
                    {isAdmin ? (
                        <input
                            type="number"
                            step="0.01"
                            className={`w-20 rounded border px-1.5 py-1 text-sm text-right ${isDirty && alisFiyati !== (urun.distributor_alis_fiyati ?? 0) ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                            value={alisFiyati}
                            onChange={e => setAlisFiyati(Number(e.target.value))}
                            disabled={loading}
                        />
                    ) : (
                        <span className="text-sm text-slate-700">{formatCurrency(urun.distributor_alis_fiyati, locale)}</span>
                    )}
                </td>
            )}

            {/* Müşteri fiyatı */}
            <td className="px-3 py-2 text-right">
                <span className="text-sm font-medium text-emerald-800">{formatCurrency(urun.satis_fiyati_musteri, locale)}</span>
            </td>

            {/* Alt bayi fiyatı */}
            <td className="px-3 py-2 text-right">
                <span className="text-sm font-medium text-blue-800">{formatCurrency(urun.satis_fiyati_alt_bayi, locale)}</span>
            </td>

            {/* Kaydet + Detay */}
            <td className="px-3 py-2 text-right">
                <div className="flex justify-end items-center gap-1">
                    {isAdmin && (
                        <button
                            className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                                success ? 'bg-emerald-600 text-white' : isDirty ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-900 text-white hover:bg-slate-700'
                            } disabled:opacity-50`}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? '...' : success ? '✓' : 'Kaydet'}
                        </button>
                    )}
                    <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`}
                        className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        ↗
                    </Link>
                </div>
                {error && <div className="text-[10px] text-red-500 mt-0.5 text-right">{error}</div>}
            </td>
        </tr>
    );
}
