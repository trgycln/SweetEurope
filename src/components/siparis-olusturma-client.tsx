'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { useRouter } from 'next/navigation';
import {
    FiPlus, FiTrash2, FiShoppingCart, FiSearch,
    FiLoader, FiSend, FiPackage, FiX, FiImage
} from 'react-icons/fi';
import Image from 'next/image';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config';

// ── Tipler ────────────────────────────────────────────────────────────────
type ProductOption = Pick<Tables<'urunler'>,
    'id' | 'ad' | 'stok_kodu' | 'ana_resim_url' |
    'satis_fiyati_musteri' | 'satis_fiyati_toptanci' |
    'satis_fiyati_alt_bayi' | 'stok_miktari' |
    'koli_ici_adet' | 'palet_ici_adet'
>;
type FirmaWithFinanz = Tables<'firmalar'> & {
    firmalar_finansal: Tables<'firmalar_finansal'> | null
};
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type UserRole = Enums<'user_role'> | null;
type Birim = 'koli' | 'adet' | 'palet';

type SepetItem = {
    urunId: string;
    urunAdi: string;
    urun: ProductOption;
    miktar: number;       // koli/palet sayısı veya adet sayısı
    birim: Birim;
    stokMiktari: number;
};

interface Props {
    firma: FirmaWithFinanz | null;
    firmenListe: FirmaOption[] | null;
    varsayilanTeslimatAdresi: string;
    urunler: ProductOption[];
    userRole: UserRole;
    locale: Locale;
}

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────
function getProductName(ad: any, locale: string): string {
    if (!ad || typeof ad !== 'object') return 'Ürün';
    return ad[locale] || ad['de'] || ad['tr'] || Object.values(ad)[0] as string || 'Ürün';
}

function formatFiyat(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
}

function getAdetFiyat(urun: ProductOption, birim: Birim, miktar: number, userRole: UserRole, indirimOrani: number): number {
    let base: number;
    if (birim === 'palet') {
        base = Number(urun.satis_fiyati_alt_bayi ?? urun.satis_fiyati_musteri ?? 0);
    } else if (birim === 'koli' && miktar >= 5) {
        base = Number(urun.satis_fiyati_toptanci ?? urun.satis_fiyati_musteri ?? 0);
    } else if (userRole === 'Alt Bayi') {
        base = Number(urun.satis_fiyati_alt_bayi ?? urun.satis_fiyati_musteri ?? 0);
    } else {
        base = Number(urun.satis_fiyati_musteri ?? 0);
    }
    return base * (1 - indirimOrani / 100);
}

function getToplamAdet(urun: ProductOption, birim: Birim, miktar: number): number {
    const koliAdet = Number(urun.koli_ici_adet ?? 1);
    const paletAdet = Number(urun.palet_ici_adet ?? koliAdet);
    if (birim === 'palet') return paletAdet * miktar;
    if (birim === 'koli') return koliAdet * miktar;
    return miktar;
}

// ── Mini Modal ─────────────────────────────────────────────────────────────
function SepeteEkleModal({
    urun, locale, userRole, indirimOrani, onClose, onAdd,
}: {
    urun: ProductOption;
    locale: string;
    userRole: UserRole;
    indirimOrani: number;
    onClose: () => void;
    onAdd: (miktar: number, birim: Birim) => void;
}) {
    const [birim, setBirim] = useState<Birim>('koli');
    const [miktar, setMiktar] = useState(1);

    const koliAdet = Number(urun.koli_ici_adet ?? 1);
    const paletAdet = Number(urun.palet_ici_adet ?? 0);
    const toplamAdet = getToplamAdet(urun, birim, miktar);
    const adetFiyat = getAdetFiyat(urun, birim, miktar, userRole, indirimOrani);
    const toplamFiyat = toplamAdet * adetFiyat;

    const birimOptions: { key: Birim; label: string; sub: string }[] = [
        { key: 'koli', label: 'Koli/Ktn.', sub: `${koliAdet} adet` },
        { key: 'adet', label: 'Adet/Stk.', sub: 'Tekli' },
        ...(paletAdet > 0 ? [{ key: 'palet' as Birim, label: 'Palet/Pal.', sub: `${paletAdet} adet` }] : []),
    ];

    const fiyatHint = birim === 'palet'
        ? { text: 'Palet fiyatı uygulandı', color: 'text-purple-700' }
        : birim === 'koli' && miktar >= 5
            ? { text: '5+ koli indirimi ✓', color: 'text-green-600' }
            : birim === 'koli'
                ? { text: `${5 - miktar} koli daha: toplu indirim`, color: 'text-amber-600' }
                : null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b">
                        {urun.ana_resim_url ? (
                            <Image src={urun.ana_resim_url} alt={getProductName(urun.ad, locale)}
                                width={48} height={48} className="rounded-lg object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FiImage size={20} className="text-gray-300" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 line-clamp-2">
                                {getProductName(urun.ad, locale)}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">{urun.stok_kodu}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <FiX size={18} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Birim */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Birim Seç</p>
                            <div className={`grid gap-2 ${birimOptions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {birimOptions.map(opt => (
                                    <button key={opt.key}
                                        onClick={() => { setBirim(opt.key); setMiktar(1); }}
                                        className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${
                                            birim === opt.key
                                                ? 'border-accent bg-accent/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`text-sm font-bold ${birim === opt.key ? 'text-accent' : 'text-gray-700'}`}>
                                            {opt.label}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Miktar */}
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Miktar</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setMiktar(m => Math.max(1, m - 1))}
                                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold text-lg">
                                    −
                                </button>
                                <input type="number" value={miktar}
                                    onChange={e => setMiktar(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="flex-1 text-center text-lg font-bold border-2 border-gray-200 rounded-xl py-2"
                                    min="1"
                                />
                                <button onClick={() => setMiktar(m => m + 1)}
                                    className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold text-lg">
                                    +
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 text-center mt-1.5">
                                = {toplamAdet} adet toplam
                            </p>
                        </div>

                        {/* Fiyat özeti */}
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Adet fiyatı</span>
                                <span className="font-semibold">{formatFiyat(adetFiyat)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-500">
                                    {toplamAdet} × {formatFiyat(adetFiyat)}
                                </span>
                                <span className="font-bold text-gray-800 text-lg">
                                    {formatFiyat(toplamFiyat)}
                                </span>
                            </div>
                            {fiyatHint && (
                                <p className={`text-[11px] font-semibold ${fiyatHint.color}`}>
                                    {fiyatHint.text}
                                </p>
                            )}
                            {indirimOrani > 0 && (
                                <p className="text-[11px] text-green-600 font-semibold">
                                    %{indirimOrani} özel indirim uygulandı
                                </p>
                            )}
                        </div>

                        <button onClick={() => onAdd(miktar, birim)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors">
                            <FiShoppingCart size={16} />
                            Sepete Ekle
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Ana Component ──────────────────────────────────────────────────────────
export function SiparisOlusturmaClient({
    firma: initialFirma, firmenListe,
    varsayilanTeslimatAdresi, urunler,
    userRole, locale,
}: Props) {
    const router = useRouter();
    const [sepet, setSepet] = useState<SepetItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFirmaId, setSelectedFirmaId] = useState(initialFirma?.id || '');
    const [teslimatAdresi, setTeslimatAdresi] = useState(
        varsayilanTeslimatAdresi || initialFirma?.adres || ''
    );
    const [isPending, startTransition] = useTransition();
    const [modalUrun, setModalUrun] = useState<ProductOption | null>(null);

    const indirimOrani = initialFirma?.firmalar_finansal?.ozel_indirim_orani ?? 0;
    const firmaId = initialFirma?.id || selectedFirmaId;

    // Ürün arama
    const filtrelenmisUrunler = useMemo(() => {
        const q = searchTerm.toLowerCase();
        if (!q) return urunler;
        return urunler.filter(u =>
            getProductName(u.ad, locale).toLowerCase().includes(q) ||
            (u.stok_kodu || '').toLowerCase().includes(q)
        );
    }, [searchTerm, urunler, locale]);

    // Sepete ekle
    const handleAdd = useCallback((urun: ProductOption, miktar: number, birim: Birim) => {
        setSepet(prev => {
            const existing = prev.findIndex(i => i.urunId === urun.id);
            const newItem: SepetItem = {
                urunId: urun.id,
                urunAdi: getProductName(urun.ad, locale),
                urun,
                miktar,
                birim,
                stokMiktari: urun.stok_miktari ?? 0,
            };
            if (existing > -1) {
                const updated = [...prev];
                updated[existing] = newItem;
                return updated;
            }
            return [...prev, newItem];
        });

        const birimLabel = birim === 'koli' ? 'koli' : birim === 'palet' ? 'palet' : 'adet';
        toast.success(`${miktar} ${birimLabel} → ${getProductName(urun.ad, locale)}`);
        setModalUrun(null);
    }, [locale]);

    // Birim değiştir
    const updateBirim = (urunId: string, birim: Birim) => {
        setSepet(prev => prev.map(item =>
            item.urunId === urunId ? { ...item, birim, miktar: 1 } : item
        ));
    };

    // Miktar değiştir
    const updateMiktar = (urunId: string, miktar: number) => {
        if (miktar <= 0) {
            setSepet(prev => prev.filter(i => i.urunId !== urunId));
            return;
        }
        setSepet(prev => prev.map(item =>
            item.urunId === urunId ? { ...item, miktar } : item
        ));
    };

    // Sepet hesaplamaları
    const sepetHesap = useMemo(() => {
        return sepet.map(item => {
            const toplamAdet = getToplamAdet(item.urun, item.birim, item.miktar);
            const adetFiyat = getAdetFiyat(item.urun, item.birim, item.miktar, userRole, indirimOrani);
            return { ...item, toplamAdet, adetFiyat, toplamFiyat: toplamAdet * adetFiyat };
        });
    }, [sepet, userRole, indirimOrani]);

    const genelToplam = sepetHesap.reduce((acc, i) => acc + i.toplamFiyat, 0);
    const toplamAdetToplam = sepetHesap.reduce((acc, i) => acc + i.toplamAdet, 0);

    // Siparişi gönder
    const handleSiparisOnayla = () => {
        if (!firmaId) { toast.error('Firma seçin.'); return; }
        if (sepet.length === 0) { toast.error('Sepet boş.'); return; }
        if (!teslimatAdresi) { toast.error('Teslimat adresi girin.'); return; }

        startTransition(async () => {
            const items = sepetHesap.map(item => ({
                urun_id: item.urunId,
                adet: item.toplamAdet,
                o_anki_satis_fiyati: item.adetFiyat,
            }));

            const result = await siparisOlusturAction({
                firmaId,
                teslimatAdresi,
                items,
                kaynak: 'Admin Paneli' as const,
            });

            if (result?.error) {
                toast.error(`Hata: ${result.error}`);
            } else if (result?.success && result.orderId) {
                toast.success(`Sipariş #${result.orderId.slice(0, 8).toUpperCase()} oluşturuldu!`);
                setSepet([]);
                router.push(`/${locale}/admin/crm/firmalar/${firmaId}/siparisler`);
            }
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Sol: Ürün Katalogu */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <FiPackage size={16} className="text-accent" />
                        Ürün Katalogu
                    </h2>
                </div>

                {/* Arama */}
                <div className="px-5 py-3 border-b border-gray-100">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Ürün adı veya kod ara..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                    </div>
                </div>

                {/* Ürün tablosu */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-50">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase w-12" />
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase">Ürün</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase">1 Koli</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase">5+ Koli</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase">Palet</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-400 uppercase w-24">Stok</th>
                                <th className="px-4 py-3 w-24" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtrelenmisUrunler.length > 0 ? filtrelenmisUrunler.map(urun => {
                                const inSepet = sepet.find(i => i.urunId === urun.id);
                                const isOutOfStock = (urun.stok_miktari ?? 0) <= 0;
                                const koliAdet = Number(urun.koli_ici_adet ?? 1);

                                return (
                                    <tr key={urun.id}
                                        className={`hover:bg-gray-50/50 transition-colors ${isOutOfStock ? 'opacity-40' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="relative w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                                                {urun.ana_resim_url ? (
                                                    <Image src={urun.ana_resim_url}
                                                        alt={getProductName(urun.ad, locale)}
                                                        fill sizes="40px" className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <FiImage size={14} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                                                {getProductName(urun.ad, locale)}
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-mono">
                                                {urun.stok_kodu}
                                                {koliAdet > 1 && (
                                                    <span className="ml-1.5 text-gray-300">
                                                        · {koliAdet} adet/koli
                                                    </span>
                                                )}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">
                                            {formatFiyat(Number(urun.satis_fiyati_musteri ?? 0) * (1 - indirimOrani / 100))}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700 whitespace-nowrap">
                                            {urun.satis_fiyati_toptanci
                                                ? formatFiyat(Number(urun.satis_fiyati_toptanci) * (1 - indirimOrani / 100))
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-purple-700 whitespace-nowrap">
                                            {urun.satis_fiyati_alt_bayi
                                                ? formatFiyat(Number(urun.satis_fiyati_alt_bayi) * (1 - indirimOrani / 100))
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                isOutOfStock
                                                    ? 'bg-red-50 text-red-600'
                                                    : (urun.stok_miktari ?? 0) <= 20
                                                        ? 'bg-amber-50 text-amber-600'
                                                        : 'bg-green-50 text-green-600'
                                            }`}>
                                                {urun.stok_miktari ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {inSepet ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[11px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                        ✓ {inSepet.miktar} {inSepet.birim}
                                                    </span>
                                                    <button
                                                        onClick={() => setModalUrun(urun)}
                                                        className="text-[10px] text-gray-400 hover:text-accent"
                                                    >
                                                        değiştir
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => !isOutOfStock && setModalUrun(urun)}
                                                    disabled={isOutOfStock}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                        isOutOfStock
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-accent text-white hover:bg-accent/90'
                                                    }`}
                                                >
                                                    <FiPlus size={12} /> Ekle
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                                        Ürün bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sağ: Sepet */}
            <div className="lg:col-span-1 sticky top-6 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <FiShoppingCart size={16} className="text-accent" />
                            Sepet
                        </h2>
                        {sepet.length > 0 && (
                            <span className="text-xs text-gray-400">
                                {toplamAdetToplam} adet toplam
                            </span>
                        )}
                    </div>

                    {/* Firma seçimi */}
                    {!initialFirma && firmenListe && (
                        <div className="px-5 py-3 border-b border-gray-100">
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                Firma *
                            </label>
                            <select
                                value={selectedFirmaId}
                                onChange={e => setSelectedFirmaId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-accent/30"
                            >
                                <option value="">Firma seçin...</option>
                                {firmenListe.map(f => (
                                    <option key={f.id} value={f.id}>{f.unvan}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Sepet ürünleri */}
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                        {sepetHesap.length === 0 ? (
                            <div className="px-5 py-8 text-center">
                                <FiShoppingCart size={24} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Sepet boş</p>
                                <p className="text-xs text-gray-300 mt-0.5">Katalogdan ürün ekleyin</p>
                            </div>
                        ) : sepetHesap.map(item => (
                            <div key={item.urunId} className="px-4 py-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="text-sm font-semibold text-gray-800 line-clamp-1 flex-1">
                                        {item.urunAdi}
                                    </p>
                                    <button
                                        onClick={() => setSepet(p => p.filter(i => i.urunId !== item.urunId))}
                                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        <FiTrash2 size={13} />
                                    </button>
                                </div>

                                {/* Birim toggle */}
                                <div className="flex gap-1 mb-2">
                                    {(['koli', 'adet', 'palet'] as Birim[]).map(b => {
                                        const paletAdet = Number(item.urun.palet_ici_adet ?? 0);
                                        if (b === 'palet' && paletAdet === 0) return null;
                                        return (
                                            <button key={b}
                                                onClick={() => updateBirim(item.urunId, b)}
                                                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                                                    item.birim === b
                                                        ? b === 'palet'
                                                            ? 'bg-purple-600 text-white border-purple-600'
                                                            : b === 'adet'
                                                                ? 'bg-slate-700 text-white border-slate-700'
                                                                : 'bg-accent text-white border-accent'
                                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                {b === 'koli' ? 'Koli' : b === 'palet' ? 'Palet' : 'Adet'}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Miktar + fiyat */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => updateMiktar(item.urunId, item.miktar - 1)}
                                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm font-bold"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            value={item.miktar}
                                            onChange={e => updateMiktar(item.urunId, parseInt(e.target.value) || 1)}
                                            className="w-12 text-center text-sm font-bold border border-gray-200 rounded py-0.5"
                                            min="1"
                                        />
                                        <button
                                            onClick={() => updateMiktar(item.urunId, item.miktar + 1)}
                                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-sm font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-800">
                                            {formatFiyat(item.toplamFiyat)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {item.toplamAdet} adet × {formatFiyat(item.adetFiyat)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Toplam + Sipariş */}
                    {sepet.length > 0 && (
                        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
                            {/* Teslimat adresi */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                                    Teslimat Adresi *
                                </label>
                                <textarea
                                    value={teslimatAdresi}
                                    onChange={e => setTeslimatAdresi(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 resize-none"
                                    placeholder="Teslimat adresi..."
                                />
                            </div>

                            {indirimOrani > 0 && (
                                <p className="text-xs text-green-600 font-semibold">
                                    ✓ %{indirimOrani} özel indirim uygulandı
                                </p>
                            )}

                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-bold text-gray-700">Toplam (Net)</span>
                                <span className="text-xl font-bold text-accent">
                                    {formatFiyat(genelToplam)}
                                </span>
                            </div>

                            <button
                                onClick={handleSiparisOnayla}
                                disabled={isPending || !firmaId || !teslimatAdresi}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {isPending ? <FiLoader className="animate-spin" size={16} /> : <FiSend size={16} />}
                                {isPending ? 'İşleniyor...' : 'Siparişi Tamamla'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mini Modal */}
            {modalUrun && (
                <SepeteEkleModal
                    urun={modalUrun}
                    locale={locale}
                    userRole={userRole}
                    indirimOrani={indirimOrani}
                    onClose={() => setModalUrun(null)}
                    onAdd={(miktar, birim) => handleAdd(modalUrun, miktar, birim)}
                />
            )}
        </div>
    );
}
