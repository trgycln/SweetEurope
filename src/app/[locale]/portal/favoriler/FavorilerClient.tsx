'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FiHeart, FiPackage, FiSearch, FiList, FiGrid
} from 'react-icons/fi';
import { toast } from 'sonner';
import { getPortalLabels } from '@/lib/portalLabels';
import { usePortal } from '@/contexts/PortalContext';
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';
import { ProduktMitPreis } from '../katalog/types';
import {
    ProduktGridCard,
    ProduktListRow,
    SepeteEkleModal,
    getBirimFiyatKatalog,
    Birim,
    getLocalizedName
} from '@/components/portal/katalog/KatalogProductCard';

interface Props {
    favoriler: ProduktMitPreis[];
    locale: Locale;
    dictionary?: Dictionary | null;
    userRole: string;
    firmaId: string;
}

export default function FavorilerClient({ favoriler: initialFavoriler, locale, dictionary, userRole, firmaId }: Props) {
    const router = useRouter();
    const { addToWarenkorb } = usePortal();
    const [isPending, startTransition] = useTransition();
    const [favoriListesi, setFavoriListesi] = useState<ProduktMitPreis[]>(initialFavoriler);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [modalProdukt, setModalProdukt] = useState<ProduktMitPreis | null>(null);

    // Initial favoriler prop'u değiştikçe state'i senkronize et
    useEffect(() => {
        setFavoriListesi(initialFavoriler);
    }, [initialFavoriler]);

    useEffect(() => {
        const saved = localStorage.getItem('favoriler-view-mode');
        if (saved === 'list' || saved === 'grid') setViewMode(saved);
    }, []);

    const toggleViewMode = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('favoriler-view-mode', mode);
    };

    const L = getPortalLabels(locale);

    // Arama filtreleme
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return favoriListesi;
        return favoriListesi.filter(u => {
            const ad = getLocalizedName(u.ad, locale).toLowerCase();
            const sku = (u.stok_kodu || '').toLowerCase();
            return ad.includes(q) || sku.includes(q);
        });
    }, [favoriListesi, search, locale]);

    // Favoriden çıkarma
    const handleToggleFavorite = (urunId: string) => {
        const confirmMsg = locale === 'de'
            ? 'Möchten Sie dieses Produkt wirklich aus den Favoriten entfernen?'
            : locale === 'en'
            ? 'Do you really want to remove this product from favorites?'
            : locale === 'ar'
            ? 'هل أنت متأكد من إزالة هذا المنتج من المفضلة؟'
            : 'Bu ürünü favorilerden çıkarmak istediğinize emin misiniz?';

        if (!confirm(confirmMsg)) return;

        // Optimistic UI güncellemesi
        setFavoriListesi(prev => prev.filter(item => item.id !== urunId));

        startTransition(async () => {
            try {
                const { createDynamicSupabaseClient } = await import('@/lib/supabase/client');
                const supabase = createDynamicSupabaseClient(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    toast.error(locale === 'de' ? 'Sitzung nicht gefunden' : 'Oturum bulunamadı');
                    return;
                }
                const { error } = await supabase.from('favori_urunler')
                    .delete().eq('kullanici_id', user.id).eq('urun_id', urunId);
                if (error) {
                    toast.error(error.message);
                    setFavoriListesi(initialFavoriler); // Hata durumunda geri al
                } else {
                    toast.success(
                        locale === 'de'
                            ? 'Aus Favoriten entfernt'
                            : locale === 'en'
                            ? 'Removed from favorites'
                            : locale === 'ar'
                            ? 'تمت الإزالة من المفضلة'
                            : 'Favorilerden çıkarıldı'
                    );
                    router.refresh();
                }
            } catch (err: any) {
                toast.error(err?.message || 'Error');
                setFavoriListesi(initialFavoriler);
            }
        });
    };

    // Hızlı Sepete Ekle (1 Koli)
    const handleQuickAdd = (produkt: ProduktMitPreis) => {
        const adetFiyat = getBirimFiyatKatalog(produkt, 'koli', 1, userRole);
        addToWarenkorb({ ...produkt, partnerPreis: adetFiyat }, 1, 'koli');
        const prodName = getLocalizedName(produkt.ad, locale);
        toast.success(
            locale === 'de'
                ? `✓ 1 Karton ${prodName} in den Warenkorb gelegt!`
                : locale === 'en'
                ? `✓ 1 case of ${prodName} added to cart!`
                : locale === 'ar'
                ? `✓ تمت إضافة كرتون واحد من ${prodName} إلى السلة!`
                : `✓ 1 Koli ${prodName} sepete eklendi!`
        );
    };

    // Modal üzerinden sepete ekleme
    const handleModalAdd = (miktar: number, birim: Birim) => {
        if (!modalProdukt) return;
        const adetFiyat = getBirimFiyatKatalog(modalProdukt, birim, miktar, userRole);
        addToWarenkorb({ ...modalProdukt, partnerPreis: adetFiyat }, miktar, birim);
        const prodName = getLocalizedName(modalProdukt.ad, locale);
        const birimLabel = birim === 'palet'
            ? (locale === 'de' ? 'Palette(n)' : 'palet')
            : birim === 'koli'
            ? (locale === 'de' ? 'Karton(s)' : 'koli')
            : (locale === 'de' ? 'Stück' : 'adet');

        toast.success(
            locale === 'de'
                ? `✓ ${miktar} ${birimLabel} ${prodName} in den Warenkorb gelegt!`
                : locale === 'en'
                ? `✓ ${miktar} ${birimLabel} of ${prodName} added to cart!`
                : locale === 'ar'
                ? `✓ تمت إضافة ${miktar} ${birimLabel} من ${prodName} إلى السلة!`
                : `✓ ${miktar} ${birimLabel} ${prodName} sepete eklendi!`
        );
        setModalProdukt(null);
    };

    if (favoriListesi.length === 0) {
        return (
            <div className="space-y-5">
                <header>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FiHeart className="text-pink-500" /> {L.favoritesTitle}
                    </h1>
                </header>
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <FiHeart className="mx-auto text-5xl text-slate-300 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-700">{L.favoritesEmpty}</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{L.favoritesEmptyHint}</p>
                    <Link
                        href={`/${locale}/portal/katalog`}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-md"
                    >
                        <FiPackage size={14} /> {L.goCatalog}
                    </Link>
                </div>
            </div>
        );
    }

    const countText = locale === 'de'
        ? `${favoriListesi.length} Favoriten`
        : locale === 'en'
        ? `${favoriListesi.length} Favorites`
        : locale === 'ar'
        ? `${favoriListesi.length} منتجات مفضلة`
        : `${favoriListesi.length} Favori Ürün`;

    return (
        <div className="space-y-6 pb-24">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl sm:text-4xl font-bold text-primary flex items-center gap-2.5">
                        <FiHeart className="text-red-500 fill-red-500" size={28} />
                        {L.favoritesTitle}
                    </h1>
                    <p className="text-sm text-text-main/80 mt-1">
                        {countText} · {L.favoritesSubtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                    {/* View mode toggle */}
                    <div className="flex border border-gray-200 bg-white rounded-xl overflow-hidden shadow-sm p-1">
                        <button
                            onClick={() => toggleViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-accent text-white'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                            title="Grid"
                        >
                            <FiGrid size={16} />
                        </button>
                        <button
                            onClick={() => toggleViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-accent text-white'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                            title="List"
                        >
                            <FiList size={16} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={L.searchFavorites}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Ürün Listesi */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500 shadow-sm">
                    <p className="text-sm">
                        {locale === 'de'
                            ? 'Keine Produkte gefunden, die Ihrer Suche entsprechen.'
                            : locale === 'en'
                            ? 'No products found matching your search.'
                            : locale === 'ar'
                            ? 'لم يتم العثور على منتجات تطابق بحثك.'
                            : 'Aramanıza uygun favori ürün bulunamadı.'}
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-stretch">
                    {filtered.map(produkt => (
                        <ProduktGridCard
                            key={produkt.id}
                            produkt={produkt}
                            isFavorit={true}
                            locale={locale}
                            dictionary={dictionary}
                            isPending={isPending}
                            onToggleFavorite={handleToggleFavorite}
                            onQuickAdd={handleQuickAdd}
                            onOpenModal={setModalProdukt}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(produkt => (
                        <ProduktListRow
                            key={produkt.id}
                            produkt={produkt}
                            isFavorit={true}
                            locale={locale}
                            dictionary={dictionary}
                            isPending={isPending}
                            onToggleFavorite={handleToggleFavorite}
                            onQuickAdd={handleQuickAdd}
                            onOpenModal={setModalProdukt}
                        />
                    ))}
                </div>
            )}

            {/* Sepete Ekle Modal */}
            {modalProdukt && (
                <SepeteEkleModal
                    produkt={modalProdukt}
                    locale={locale}
                    onClose={() => setModalProdukt(null)}
                    onAdd={handleModalAdd}
                />
            )}
        </div>
    );
}
