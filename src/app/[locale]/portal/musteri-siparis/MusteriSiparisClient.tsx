'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
    FiArrowLeft, FiSearch, FiShoppingCart, FiTrash2,
    FiPlus, FiX, FiSend, FiPackage, FiImage,
    FiUser,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';

type Birim = 'koli' | 'adet' | 'palet';
type Musteri = {
    id: string; unvan: string; adres: string | null;
    email: string | null; telefon: string | null; sehir?: string | null;
};
type Urun = {
    id: string; ad: any; stok_kodu: string | null; ana_resim_url: string | null;
    satis_fiyati_musteri: number | null; satis_fiyati_toptanci: number | null;
    satis_fiyati_alt_bayi: number | null; stok_miktari: number | null;
    koli_ici_adet: number | null; palet_ici_adet: number | null;
};
type SepetItem = { urun: Urun; miktar: number; birim: Birim };

interface Props {
    musteriler: Musteri[];
    urunler: Urun[];
    seciliMusteri: Musteri | null;
    bayiFirmaId: string;
    locale: string;
    dictionary: any;
}

function getAd(ad: any, locale: string): string {
    if (!ad || typeof ad !== 'object') return 'Ürün';
    return ad[locale] || ad['de'] || ad['tr'] || (Object.values(ad)[0] as string) || 'Ürün';
}

function fmt(v: number | null | undefined): string {
    if (!v) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
}

function getAdetFiyat(urun: Urun, birim: Birim, miktar: number): number {
    if (birim === 'palet') return Number(urun.satis_fiyati_alt_bayi ?? urun.satis_fiyati_musteri ?? 0);
    if (birim === 'koli' && miktar >= 5) return Number(urun.satis_fiyati_toptanci ?? urun.satis_fiyati_musteri ?? 0);
    return Number(urun.satis_fiyati_musteri ?? 0);
}

function getToplamAdet(urun: Urun, birim: Birim, miktar: number): number {
    const koliAdet = Number(urun.koli_ici_adet ?? 1);
    if (birim === 'palet') {
        const paletKoli = Number(urun.palet_ici_adet ?? 0);
        return (paletKoli > 0 ? paletKoli * koliAdet : koliAdet) * miktar;
    }
    if (birim === 'koli') return koliAdet * miktar;
    return miktar;
}

// ── Sepete Ekle Modal ──────────────────────────────────────────────────────
function SepeteEkleModal({ urun, locale, onClose, onAdd }: {
    urun: Urun; locale: string;
    onClose: () => void;
    onAdd: (miktar: number, birim: Birim) => void;
}) {
    const [birim, setBirim] = useState<Birim>('koli');
    const [miktar, setMiktar] = useState(1);

    const koliAdet = Number(urun.koli_ici_adet ?? 1);
    const paletAdet = Number(urun.palet_ici_adet ?? 0);
    const toplamAdet = getToplamAdet(urun, birim, miktar);
    const adetFiyat = getAdetFiyat(urun, birim, miktar);
    const toplamFiyat = toplamAdet * adetFiyat;

    const satisFiyatlari = [
        { label: `1 ${locale === 'de' ? 'Ktn.' : 'koli'}`, fiyat: urun.satis_fiyati_musteri, color: 'text-slate-700' },
        { label: `5+ ${locale === 'de' ? 'Ktn.' : 'koli'}`, fiyat: urun.satis_fiyati_toptanci, color: 'text-blue-700' },
        ...(paletAdet > 0 ? [{ label: locale === 'de' ? 'Palette' : 'Palet', fiyat: urun.satis_fiyati_alt_bayi, color: 'text-purple-700' }] : []),
    ];

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b">
                        {urun.ana_resim_url ? (
                            <Image src={urun.ana_resim_url} alt={getAd(urun.ad, locale)}
                                width={48} height={48} className="rounded-lg object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FiImage size={20} className="text-gray-300" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-800 line-clamp-2">{getAd(urun.ad, locale)}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{urun.stok_kodu}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                            <FiX size={18} />
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-[11px] font-bold text-blue-700 mb-1.5">
                                {locale === 'de' ? 'Verkaufspreise für Ihren Kunden:' : 'Müşterinize satış fiyatları:'}
                            </p>
                            <div className="space-y-0.5">
                                {satisFiyatlari.map((s, i) => s.fiyat ? (
                                    <div key={i} className="flex justify-between text-[11px]">
                                        <span className="text-slate-600">{s.label}</span>
                                        <span className={`font-bold ${s.color}`}>{fmt(Number(s.fiyat))}</span>
                                    </div>
                                ) : null)}
                            </div>
                            <div className="mt-2 pt-2 border-t border-blue-200">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500">
                                        {locale === 'de' ? 'Ihr Einkaufspreis:' : 'Sizin alış fiyatınız:'}
                                    </span>
                                    <span className="font-bold text-green-700">{fmt(Number(urun.satis_fiyati_alt_bayi ?? 0))}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                                {locale === 'de' ? 'Einheit' : 'Birim'}
                            </p>
                            <div className={`grid gap-2 ${paletAdet > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {(['koli', 'adet', ...(paletAdet > 0 ? ['palet'] : [])] as Birim[]).map(b => (
                                    <button key={b}
                                        onClick={() => { setBirim(b); setMiktar(1); }}
                                        className={`flex flex-col items-center p-2.5 rounded-xl border-2 transition-all ${
                                            birim === b ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`text-sm font-bold ${birim === b ? 'text-accent' : 'text-gray-700'}`}>
                                            {b === 'koli' ? (locale === 'de' ? 'Karton' : 'Koli')
                                                : b === 'palet' ? (locale === 'de' ? 'Palette' : 'Palet')
                                                : (locale === 'de' ? 'Stück' : 'Adet')}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">
                                            {b === 'koli' ? `${koliAdet} adet`
                                                : b === 'palet' ? `${paletAdet} ${locale === 'de' ? 'Karton' : 'koli'}`
                                                : (locale === 'de' ? 'Einzeln' : 'Tekli')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

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
                        <p className="text-xs text-gray-400 text-center">= {toplamAdet} adet toplam</p>

                        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Einkaufspreis/Stk.' : 'Alış fiyatı/adet'}
                                </span>
                                <span className="font-semibold">{fmt(adetFiyat)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm text-gray-500">
                                    {toplamAdet} × {fmt(adetFiyat)}
                                </span>
                                <span className="font-bold text-gray-800 text-lg">{fmt(toplamFiyat)}</span>
                            </div>
                        </div>

                        <button onClick={() => onAdd(miktar, birim)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors">
                            <FiShoppingCart size={16} />
                            {locale === 'de' ? 'In den Warenkorb' : 'Sepete Ekle'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Ana Component ──────────────────────────────────────────────────────────
export function MusteriSiparisClient({
    musteriler, urunler, seciliMusteri, bayiFirmaId, locale, dictionary,
}: Props) {
    const router = useRouter();
    const [musteri, setMusteri] = useState<Musteri | null>(seciliMusteri);
    const [search, setSearch] = useState('');
    const [sepet, setSepet] = useState<SepetItem[]>([]);
    const [modalUrun, setModalUrun] = useState<Urun | null>(null);
    const [teslimatAdresi, setTeslimatAdresi] = useState(seciliMusteri?.adres || '');
    const [isPending, startTransition] = useTransition();

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return urunler;
        return urunler.filter(u =>
            getAd(u.ad, locale).toLowerCase().includes(q) ||
            (u.stok_kodu || '').toLowerCase().includes(q)
        );
    }, [urunler, search, locale]);

    const sepetHesap = useMemo(() => sepet.map(item => {
        const toplamAdet = getToplamAdet(item.urun, item.birim, item.miktar);
        const adetFiyat = getAdetFiyat(item.urun, item.birim, item.miktar);
        return { ...item, toplamAdet, adetFiyat, toplamFiyat: toplamAdet * adetFiyat };
    }), [sepet]);

    const genelToplam = sepetHesap.reduce((acc, i) => acc + i.toplamFiyat, 0);

    const handleAdd = (urun: Urun, miktar: number, birim: Birim) => {
        setSepet(prev => {
            const existing = prev.findIndex(i => i.urun.id === urun.id);
            const newItem = { urun, miktar, birim };
            if (existing > -1) {
                const updated = [...prev];
                updated[existing] = newItem;
                return updated;
            }
            return [...prev, newItem];
        });
        toast.success(`${miktar} ${birim} → ${getAd(urun.ad, locale)}`);
        setModalUrun(null);
    };

    const updateBirim = (urunId: string, birim: Birim) => {
        setSepet(prev => prev.map(i => i.urun.id === urunId ? { ...i, birim, miktar: 1 } : i));
    };

    const updateMiktar = (urunId: string, miktar: number) => {
        if (miktar <= 0) {
            setSepet(prev => prev.filter(i => i.urun.id !== urunId));
            return;
        }
        setSepet(prev => prev.map(i => i.urun.id === urunId ? { ...i, miktar } : i));
    };

    const handleSiparisOnayla = () => {
        if (!musteri) { toast.error('Müşteri seçin'); return; }
        if (sepet.length === 0) { toast.error('Sepet boş'); return; }
        if (!teslimatAdresi) { toast.error('Teslimat adresi girin'); return; }

        startTransition(async () => {
            const items = sepetHesap.map(item => ({
                urun_id: item.urun.id,
                adet: item.toplamAdet,
                o_anki_satis_fiyati: item.adetFiyat,
            }));

            const result = await siparisOlusturAction({
                firmaId: musteri.id,
                teslimatAdresi,
                items,
                kaynak: 'Müşteri Portalı',
            });

            if (result?.error) {
                toast.error(`Hata: ${result.error}`);
            } else if (result?.success && result.orderId) {
                toast.success(`Sipariş #${result.orderId.slice(0, 8).toUpperCase()} oluşturuldu!`);
                setSepet([]);
                router.push(`/${locale}/portal/musterilerim`);
            }
        });
    };

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/${locale}/portal/musterilerim`}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                    <FiArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">
                        {locale === 'de' ? 'Bestellung für Kunden' : 'Müşteri Adına Sipariş'}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {locale === 'de'
                            ? 'Wählen Sie einen Kunden und erstellen Sie eine Bestellung'
                            : 'Müşteri seçin ve sipariş oluşturun'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Sol: Ürün katalogu */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Müşteri seçimi */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <FiUser size={12} />
                            {locale === 'de' ? 'Kunde auswählen' : 'Müşteri Seç'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {musteriler.map(m => (
                                <button key={m.id}
                                    onClick={() => {
                                        setMusteri(m);
                                        setTeslimatAdresi(m.adres || '');
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                                        musteri?.id === m.id
                                            ? 'border-accent bg-accent/5'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <FiUser size={14} className="text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{m.unvan}</p>
                                        {m.sehir && (
                                            <p className="text-[11px] text-slate-400 truncate">{m.sehir}</p>
                                        )}
                                    </div>
                                    {musteri?.id === m.id && (
                                        <span className="ml-auto text-accent text-xs font-bold flex-shrink-0">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {musteriler.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-sm text-slate-400">
                                    {locale === 'de' ? 'Noch keine Kunden' : 'Henüz müşteri yok'}
                                </p>
                                <Link href={`/${locale}/portal/musterilerim`}
                                    className="mt-2 inline-block text-xs text-accent hover:underline">
                                    {locale === 'de' ? 'Kunden hinzufügen →' : 'Müşteri ekle →'}
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Ürün tablosu */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input type="text"
                                    placeholder={locale === 'de' ? 'Produkt suchen...' : 'Ürün ara...'}
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/30"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-50">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase w-10" />
                                        <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase">
                                            {locale === 'de' ? 'Produkt' : 'Ürün'}
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-400 uppercase">
                                            {locale === 'de' ? 'Alış' : 'Alış'}
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-400 uppercase">
                                            {locale === 'de' ? '1 Ktn.' : '1 Koli'}
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-400 uppercase">
                                            {locale === 'de' ? '5+ Ktn.' : '5+ Koli'}
                                        </th>
                                        <th className="px-3 py-2.5 w-20" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.map(urun => {
                                        const inSepet = sepet.find(i => i.urun.id === urun.id);
                                        const isOutOfStock = false; // Stok kontrolü alt bayi için devre dışı

                                        return (
                                            <tr key={urun.id}
                                                className={`hover:bg-slate-50/50 transition-colors ${isOutOfStock ? 'opacity-40' : ''}`}>
                                                <td className="px-3 py-2.5">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden relative">
                                                        {urun.ana_resim_url ? (
                                                            <Image src={urun.ana_resim_url} alt={getAd(urun.ad, locale)}
                                                                fill sizes="40px" className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <FiImage size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                                                        {getAd(urun.ad, locale)}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-mono">{urun.stok_kodu}</p>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <span className="text-sm font-bold text-green-700">
                                                        {fmt(Number(urun.satis_fiyati_alt_bayi ?? 0))}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <span className="text-sm text-slate-700">
                                                        {fmt(Number(urun.satis_fiyati_musteri ?? 0))}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                    <span className="text-sm text-blue-700">
                                                        {fmt(Number(urun.satis_fiyati_toptanci ?? 0))}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    {inSepet ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="text-[11px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                                ✓ {inSepet.miktar} {inSepet.birim}
                                                            </span>
                                                            <button onClick={() => setModalUrun(urun)}
                                                                className="text-[10px] text-slate-400 hover:text-accent">
                                                                değiştir
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => !isOutOfStock && setModalUrun(urun)}
                                                            disabled={isOutOfStock}
                                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                                                isOutOfStock
                                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                    : 'bg-accent text-white hover:bg-accent/90'
                                                            }`}
                                                        >
                                                            <FiPlus size={12} />
                                                            {locale === 'de' ? 'Hinzufügen' : 'Ekle'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sağ: Sepet */}
                <div className="sticky top-6 space-y-4">
                    {musteri && (
                        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                            <p className="text-xs font-bold text-accent uppercase tracking-wide mb-1">
                                {locale === 'de' ? 'Bestellung für:' : 'Sipariş için:'}
                            </p>
                            <p className="font-bold text-slate-800">{musteri.unvan}</p>
                            {musteri.telefon && (
                                <p className="text-xs text-slate-500 mt-0.5">{musteri.telefon}</p>
                            )}
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                                <FiShoppingCart size={15} className="text-accent" />
                                {locale === 'de' ? 'Warenkorb' : 'Sepet'}
                            </h3>
                            {sepet.length > 0 && (
                                <span className="text-xs text-slate-400">
                                    {sepetHesap.reduce((acc, i) => acc + i.toplamAdet, 0)} adet
                                </span>
                            )}
                        </div>

                        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                            {sepetHesap.length === 0 ? (
                                <div className="px-4 py-8 text-center">
                                    <FiShoppingCart size={24} className="text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">
                                        {locale === 'de' ? 'Warenkorb leer' : 'Sepet boş'}
                                    </p>
                                </div>
                            ) : sepetHesap.map(item => (
                                <div key={item.urun.id} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <p className="text-sm font-semibold text-slate-800 line-clamp-1 flex-1">
                                            {getAd(item.urun.ad, locale)}
                                        </p>
                                        <button
                                            onClick={() => setSepet(p => p.filter(i => i.urun.id !== item.urun.id))}
                                            className="text-slate-300 hover:text-red-400 flex-shrink-0">
                                            <FiTrash2 size={13} />
                                        </button>
                                    </div>

                                    <div className="flex gap-1 mb-1.5">
                                        {(['koli', 'adet', ...(Number(item.urun.palet_ici_adet ?? 0) > 0 ? ['palet'] : [])] as Birim[]).map(b => (
                                            <button key={b} onClick={() => updateBirim(item.urun.id, b)}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                                    item.birim === b
                                                        ? b === 'palet' ? 'bg-purple-600 text-white border-purple-600'
                                                            : b === 'adet' ? 'bg-slate-700 text-white border-slate-700'
                                                            : 'bg-accent text-white border-accent'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                }`}>
                                                {b === 'koli' ? 'Koli' : b === 'palet' ? 'Palet' : 'Adet'}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => updateMiktar(item.urun.id, item.miktar - 1)}
                                                className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm font-bold">−</button>
                                            <input type="number" value={item.miktar}
                                                onChange={e => updateMiktar(item.urun.id, parseInt(e.target.value) || 1)}
                                                className="w-10 text-center text-sm font-bold border border-slate-200 rounded py-0.5"
                                                min="1"
                                            />
                                            <button onClick={() => updateMiktar(item.urun.id, item.miktar + 1)}
                                                className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 text-sm font-bold">+</button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">{fmt(item.toplamFiyat)}</p>
                                            <p className="text-[10px] text-green-600">
                                                alış: {fmt(item.adetFiyat)}/adet
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {sepet.length > 0 && (
                            <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                        {locale === 'de' ? 'Lieferadresse *' : 'Teslimat Adresi *'}
                                    </label>
                                    <textarea
                                        value={teslimatAdresi}
                                        onChange={e => setTeslimatAdresi(e.target.value)}
                                        rows={2}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30 resize-none"
                                        placeholder={locale === 'de' ? 'Lieferadresse...' : 'Teslimat adresi...'}
                                    />
                                </div>

                                <div className="flex justify-between items-baseline">
                                    <span className="text-sm font-bold text-slate-700">
                                        {locale === 'de' ? 'Gesamt (Einkauf):' : 'Toplam (Alış):'}
                                    </span>
                                    <span className="text-xl font-bold text-green-700">{fmt(genelToplam)}</span>
                                </div>

                                <button
                                    onClick={handleSiparisOnayla}
                                    disabled={isPending || !musteri || !teslimatAdresi}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isPending
                                        ? <FiPackage className="animate-bounce" size={16} />
                                        : <FiSend size={16} />}
                                    {isPending
                                        ? (locale === 'de' ? 'Wird bearbeitet...' : 'İşleniyor...')
                                        : (locale === 'de' ? 'Bestellung aufgeben' : 'Siparişi Onayla')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {modalUrun && (
                <SepeteEkleModal
                    urun={modalUrun}
                    locale={locale}
                    onClose={() => setModalUrun(null)}
                    onAdd={(miktar, birim) => handleAdd(modalUrun, miktar, birim)}
                />
            )}
        </div>
    );
}
