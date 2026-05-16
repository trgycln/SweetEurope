'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiHeart, FiTrash2, FiShoppingCart, FiPackage, FiCheck,
    FiPlus, FiMinus, FiSearch, FiX, FiArrowRight, FiInfo,
} from 'react-icons/fi';
import { toast } from 'sonner';

interface Urun {
    id: string;
    ad: any;
    slug: string;
    ana_resim_url: string | null;
    stok_kodu: string | null;
    koli_ici_adet: number | null;
    palet_ici_adet: number | null;
    stok_miktari: number | null;
    satis_fiyati_musteri: number | null;
    satis_fiyati_toptanci: number | null;
    satis_fiyati_alt_bayi: number | null;
    kategori_id: string | null;
    kategoriler?: { ad: any } | null;
    favori_eklenme_tarihi: string;
}

interface Props {
    favoriler: Urun[];
    locale: string;
    userRole: string;
    firmaId: string;
}

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

export default function FavorilerClient({ favoriler, locale, userRole, firmaId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState('');
    const [secimMap, setSecimMap] = useState<Map<string, number>>(new Map());

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return favoriler;
        return favoriler.filter(u => {
            const ad = (u.ad?.[locale] || u.ad?.de || u.ad?.tr || '').toLowerCase();
            return ad.includes(q) || (u.stok_kodu || '').toLowerCase().includes(q);
        });
    }, [favoriler, search, locale]);

    const seciliSayi = Array.from(secimMap.values()).filter(v => v > 0).length;
    const toplamKoli = Array.from(secimMap.values()).reduce((s, v) => s + v, 0);
    const toplamTutar = useMemo(() => {
        let t = 0;
        for (const u of favoriler) {
            const adet = secimMap.get(u.id) ?? 0;
            if (adet > 0) {
                const fiyat = userRole === 'Alt Bayi'
                    ? Number(u.satis_fiyati_alt_bayi ?? 0)
                    : Number(u.satis_fiyati_musteri ?? 0);
                t += fiyat * adet;
            }
        }
        return t;
    }, [favoriler, secimMap, userRole]);

    const setAdet = (id: string, adet: number) => {
        const m = new Map(secimMap);
        if (adet <= 0) m.delete(id);
        else m.set(id, adet);
        setSecimMap(m);
    };

    const tumunuTemizle = () => setSecimMap(new Map());

    const handleRemoveFavorite = (urunId: string) => {
        if (!confirm('Bu ürünü favorilerden çıkarmak istediğinize emin misiniz?')) return;
        startTransition(async () => {
            const { createDynamicSupabaseClient } = await import('@/lib/supabase/client');
            const supabase = createDynamicSupabaseClient(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Oturum bulunamadı');
                return;
            }
            const { error } = await supabase.from('favori_urunler')
                .delete().eq('kullanici_id', user.id).eq('urun_id', urunId);
            if (error) {
                toast.error('Favoriden çıkarılamadı: ' + error.message);
            } else {
                toast.success('Favorilerden çıkarıldı');
                router.refresh();
            }
        });
    };

    const handleSiparisOlustur = () => {
        if (seciliSayi === 0) {
            toast.error('Önce ürün seçin');
            return;
        }
        // Seçili ürünleri query string olarak sipariş sayfasına gönder
        const items = Array.from(secimMap.entries())
            .filter(([_, adet]) => adet > 0)
            .map(([id, adet]) => `${id}:${adet}`)
            .join(',');
        router.push(`/${locale}/portal/siparisler/yeni?favoriler=${encodeURIComponent(items)}`);
    };

    if (favoriler.length === 0) {
        return (
            <div className="space-y-5">
                <header>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FiHeart className="text-pink-500" /> Favorilerim
                    </h1>
                </header>
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                    <FiHeart className="mx-auto text-5xl text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700">Henüz favori ürününüz yok</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        Katalog sayfasında ürünleri ❤️ ikonuna tıklayarak favorilerinize ekleyin.
                        Buradan istediğiniz an hızlıca sipariş verebilirsiniz.
                    </p>
                    <Link href={`/${locale}/portal/katalog`}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <FiPackage size={14} /> Kataloga Git
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-32"> {/* pb-32: sticky bar için boşluk */}
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FiHeart className="text-pink-500" /> Favorilerim
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {favoriler.length} ürün · Hızlıca seçim yapıp toplu sipariş oluştur
                    </p>
                </div>
                <div className="relative w-full sm:w-64">
                    <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text" placeholder="Favori ara..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                </div>
            </div>

            {/* Bilgi bandı */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                <FiInfo size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                    <strong>Toplu Sipariş:</strong> İstediğiniz ürünlerden +/− ile koli sayısı belirleyin.
                    Aşağıdaki "Toplu Sipariş Oluştur" butonu ile seçtiklerinizi sepete ekleyin.
                </div>
            </div>

            {/* Ürün grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map(u => {
                    const ad = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Ürün';
                    const fiyat = userRole === 'Alt Bayi'
                        ? Number(u.satis_fiyati_alt_bayi ?? 0)
                        : Number(u.satis_fiyati_musteri ?? 0);
                    const adet = secimMap.get(u.id) ?? 0;
                    const inStock = (u.stok_miktari ?? 0) > 0;

                    return (
                        <div key={u.id}
                            className={`bg-white border rounded-xl overflow-hidden transition-all ${adet > 0 ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                            <div className="relative aspect-[4/3] bg-slate-50">
                                <Link href={`/${locale}/portal/katalog/${u.id}`} className="block w-full h-full">
                                    {u.ana_resim_url ? (
                                        <Image src={u.ana_resim_url} alt={ad} fill sizes="300px"
                                            className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FiPackage size={32} className="text-slate-300" />
                                        </div>
                                    )}
                                </Link>
                                <button onClick={() => handleRemoveFavorite(u.id)}
                                    disabled={isPending}
                                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors shadow-sm"
                                    title="Favorilerden çıkar">
                                    <FiTrash2 size={13} />
                                </button>
                                {!inStock && (
                                    <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded-full">
                                        Stoğa Bağlı
                                    </span>
                                )}
                                {u.kategoriler?.ad && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 py-2">
                                        <span className="text-white text-[9px] font-bold tracking-widest uppercase">
                                            {u.kategoriler.ad?.[locale] || u.kategoriler.ad?.de || ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 space-y-2">
                                <div>
                                    <Link href={`/${locale}/portal/katalog/${u.id}`}>
                                        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 hover:text-blue-600 transition-colors">
                                            {ad}
                                        </h3>
                                    </Link>
                                    {u.stok_kodu && (
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{u.stok_kodu}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-base font-bold text-blue-700">{fmt(fiyat)}</p>
                                    {u.koli_ici_adet && u.koli_ici_adet > 0 && (
                                        <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            {u.koli_ici_adet} adet/koli
                                        </span>
                                    )}
                                </div>

                                {/* Adet seçici */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                    {adet === 0 ? (
                                        <button onClick={() => setAdet(u.id, 1)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                                            <FiPlus size={12} /> Sepete Ekle
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 w-full bg-blue-50 border border-blue-200 rounded-lg p-1">
                                            <button onClick={() => setAdet(u.id, adet - 1)}
                                                className="w-7 h-7 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded transition-colors">
                                                <FiMinus size={13} />
                                            </button>
                                            <div className="flex-1 text-center">
                                                <p className="text-sm font-bold text-blue-900">{adet} koli</p>
                                                <p className="text-[9px] text-blue-600">{fmt(fiyat * adet)}</p>
                                            </div>
                                            <button onClick={() => setAdet(u.id, adet + 1)}
                                                className="w-7 h-7 flex items-center justify-center text-blue-700 hover:bg-blue-100 rounded transition-colors">
                                                <FiPlus size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && search && (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <p className="text-sm text-slate-500">"{search}" ile eşleşen favori bulunamadı</p>
                </div>
            )}

            {/* ── Sticky alt bar (seçim varsa) ── */}
            {seciliSayi > 0 && (
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t-2 border-blue-500 shadow-2xl z-40">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FiShoppingCart size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {seciliSayi} ürün · {toplamKoli} koli seçili
                                </p>
                                <p className="text-xs text-slate-500">
                                    Tahmini tutar: <strong className="text-blue-700">{fmt(toplamTutar)}</strong>
                                    <span className="text-[10px] text-slate-400 ml-1">(KDV hariç)</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={tumunuTemizle}
                                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1">
                                <FiX size={12} /> Temizle
                            </button>
                            <button onClick={handleSiparisOlustur}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-md">
                                Sipariş Oluştur <FiArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
