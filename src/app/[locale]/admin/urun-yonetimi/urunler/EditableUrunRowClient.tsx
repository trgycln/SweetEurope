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
            setError("Sunucu hatası: " + (e?.message || "Bilinmeyen hata"));
        }
        setLoading(false);
    }

    return (
        <tr className="hover:bg-gray-50 transition-colors duration-150">
            <td className="px-4 py-3 whitespace-nowrap">
                <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`} className="block">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {urun.ana_resim_url ? (
                            <img src={urun.ana_resim_url} alt={getLocalizedName(urun.ad, locale)} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[10px] text-gray-400">no img</span>
                        )}
                    </div>
                </Link>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`} className="hover:underline hover:text-accent transition-colors">
                    {getLocalizedName(urun.ad, locale)}
                </Link>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{urun.stok_kodu || "-"}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{urun.kategoriler?.ad ? getLocalizedName(urun.kategoriler.ad, locale) : (content.unknownCategory || "Ohne Kategorie")}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {isAdmin ? (
                    <input type="number" className="w-20 px-2 py-1 border rounded" value={stokMiktari} onChange={e => setStokMiktari(Number(e.target.value))} disabled={loading} />
                ) : (
                    <span className="font-medium">{urun.stok_miktari}</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                {isAdmin ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded" checked={aktif} onChange={e => setAktif(e.target.checked)} disabled={loading} />
                        <span className={`text-xs font-semibold ${aktif ? "text-green-700" : "text-red-700"}`}>{aktif ? (content.statusActive || "Aktiv") : (content.statusInactive || "Inaktiv")}</span>
                    </label>
                ) : (
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${urun.aktif ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{urun.aktif ? (content.statusActive || "Aktiv") : (content.statusInactive || "Inaktiv")}</span>
                )}
            </td>
            {canSeePurchasePrice && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isAdmin ? (
                        <input type="number" className="w-24 px-2 py-1 border rounded" value={alisFiyati} onChange={e => setAlisFiyati(Number(e.target.value))} disabled={loading} />
                    ) : (
                        <span className="font-medium">{formatCurrency(urun.distributor_alis_fiyati, locale)}</span>
                    )}
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(urun.satis_fiyati_musteri, locale)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(urun.satis_fiyati_alt_bayi, locale)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {isAdmin && (
                    <>
                        <button className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-dark disabled:opacity-50" onClick={handleSave} disabled={loading}>
                            {loading ? "Kaydediliyor..." : success ? "✓" : "Kaydet"}
                        </button>
                        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
                    </>
                )}
            </td>
        </tr>
    );
}
