'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiTrash2, FiShoppingCart, FiSearch, FiHeart } from 'react-icons/fi';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { usePortal } from '@/contexts/PortalContext';

// Tipler
type UrunWithPrice = Tables<'urunler'> & { fiyat: number };
type Firma = Tables<'firmalar'> & { firmalar_finansal: Tables<'firmalar_finansal'>[] | null };
type SepetItem = { urun: UrunWithPrice; adet: number; indirimliFiyat: number };
type SearchParams = { [key: string]: string | string[] | undefined };

// Ürün Kartı Bileşeni
function ProduktKarte({ urun, onSepeteEkle, locale, dictionary }: { urun: UrunWithPrice, onSepeteEkle: (urun: UrunWithPrice) => void, locale: Locale, dictionary: Dictionary }) {
    const content = (dictionary as any)?.portal?.newOrderPage || {};
    const stockStatusContent = content.stockStatus || {};
    
    const getStockStatus = () => {
        if (urun.stok_miktari <= 0) return { text: stockStatusContent.outOfStock || 'Tükendi', color: 'text-red-500' };
        if (urun.stok_miktari <= urun.stok_esigi) return { text: stockStatusContent.lowStock || 'Stok Az', color: 'text-yellow-500' };
        return { text: stockStatusContent.inStock || 'Stokta', color: 'text-green-500' };
    };
    const status = getStockStatus();
    const isOutOfStock = urun.stok_miktari <= 0;

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="relative w-full h-48">
                <Image 
                    src={urun.ana_resim_url || `https://placehold.co/400x400/EAE8E1/3D3D3D?text=${((urun.ad as any)?.[locale] || '...').charAt(0)}`}
                    alt={(urun.ad as any)?.[locale] || 'Ürün Resmi'} 
                    fill 
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/400x400/EAE8E1/3D3D3D?text=Hata`; }}
                />
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-serif font-bold text-primary flex-grow">{(urun.ad as any)?.[locale] || 'İsimsiz Ürün'}</h3>
                <p className="text-sm text-gray-500">{urun.stok_kodu}</p>
                <div className="flex justify-between items-center mt-4">
                    <p className={`text-xs font-bold ${status.color}`}>{status.text}</p>
                    <button onClick={() => onSepeteEkle(urun)} disabled={isOutOfStock} className="p-2 bg-accent text-white rounded-full hover:bg-opacity-80 transition-opacity disabled:bg-gray-300 disabled:cursor-not-allowed">
                        <FiPlus />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Ana İstemci Bileşeni
export function SiparisOlusturmaPartnerClient({ urunler, favoriIdSet, dictionary, locale, searchParams }: { urunler: UrunWithPrice[]; favoriIdSet: Set<string>; dictionary: Dictionary; locale: Locale; searchParams: SearchParams }) {
    const { firma } = usePortal();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, startTransition] = useTransition();
    const [showFavorites, setShowFavorites] = useState(false);
    const content = (dictionary as any)?.portal?.newOrderPage || {};
    const indirimOrani = (firma as Firma)?.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0;

    const [sepet, setSepet] = useState<SepetItem[]>(() => {
        const initialSepet: SepetItem[] = [];
        if (!searchParams) return initialSepet;

        for (const [key, value] of Object.entries(searchParams)) {
            if (key.startsWith('urun_') && value) {
                const urunId = key.substring(5);
                const adet = parseInt(value as string, 10);
                const urun = urunler.find(u => u.id === urunId);

                if (urun && adet > 0 && adet <= urun.stok_miktari) {
                    const indirimliFiyat = urun.fiyat * (1 - indirimOrani / 100);
                    initialSepet.push({ urun, adet, indirimliFiyat });
                }
            }
        }
        return initialSepet;
    });

    const formatFiyat = (fiyat: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(fiyat);

    const urunEkle = (urun: UrunWithPrice) => {
        setSepet(prev => {
            const mevcutUrun = prev.find(item => item.urun.id === urun.id);
            if (mevcutUrun) {
                const yeniAdet = mevcutUrun.adet + 1;
                if (yeniAdet > urun.stok_miktari) {
                    toast.warning((content.error?.stockNotAvailable || 'Stok yetersiz! Maksimum %{stock} adet.').replace('%{stock}', urun.stok_miktari.toString()));
                    return prev;
                }
                return prev.map(item => item.urun.id === urun.id ? { ...item, adet: yeniAdet } : item);
            } else {
                if (1 > urun.stok_miktari) {
                    toast.error(content.error?.productOutOfStock || 'Bu ürün tükendi.');
                    return prev;
                }
                const indirimliFiyat = urun.fiyat * (1 - indirimOrani / 100);
                return [...prev, { urun, adet: 1, indirimliFiyat }];
            }
        });
    };

    const adetGuncelle = (urunId: string, yeniAdet: number) => {
        if (yeniAdet <= 0) {
            setSepet(prev => prev.filter(item => item.urun.id !== urunId));
            return;
        }
        const urun = urunler.find(u => u.id === urunId);
        if (urun && yeniAdet > urun.stok_miktari) {
            toast.warning((content.error?.stockNotAvailable || 'Stok yetersiz! Maksimum %{stock} adet.').replace('%{stock}', urun.stok_miktari.toString()));
            setSepet(prev => prev.map(item => item.urun.id === urunId ? { ...item, adet: urun.stok_miktari } : item));
            return;
        }
        setSepet(prev => prev.map(item => item.urun.id === urunId ? { ...item, adet: yeniAdet } : item));
    };
    
    const filtrelenmisUrunler = useMemo(() => {
        return urunler.filter(u => {
            const urunAdi = (u.ad as any)?.[locale] || '';
            const stokKodu = u.stok_kodu || '';
            const passtZuSuche = urunAdi.toLowerCase().includes(searchTerm.toLowerCase()) || stokKodu.toLowerCase().includes(searchTerm.toLowerCase());
            const passtZuFavoriten = !showFavorites || favoriIdSet.has(u.id);
            return passtZuSuche && passtZuFavoriten;
        });
    }, [searchTerm, urunler, showFavorites, favoriIdSet, locale]);

    const toplamTutar = useMemo(() => sepet.reduce((acc, item) => acc + (item.indirimliFiyat * item.adet), 0), [sepet]);
    
    const handleSiparisOnayla = () => {
        if (sepet.length === 0) {
            toast.error(content.error?.cartEmpty || 'Sepetiniz boş.');
            return;
        }
        startTransition(async () => {
            const itemsToSubmit = sepet.map(item => ({ urun_id: item.urun.id, adet: item.adet, o_anki_satis_fiyati: item.indirimliFiyat }));
            
            const result = await siparisOlusturAction({
                firmaId: (firma as Firma).id,
                teslimatAdresi: (firma as Firma).adres || 'Adres belirtilmemiş',
                items: itemsToSubmit,
                kaynak: 'Müşteri Portalı'
            });

            if (result?.error) {
                toast.error(result.error);
            } else if (result?.success && result.orderId) {
                toast.success("Siparişiniz başarıyla oluşturuldu!");
                setSepet([]);
                router.push(`/${locale}/portal/siparisler/${result.orderId}`);
            }
        });
    };

    return (
        <div className="space-y-8">
            <header>
                 <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                 <p className="text-text-main/80 mt-1">{content.subtitle}</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                 <div className="lg:col-span-2 space-y-6">
                     <div className="flex flex-col sm:flex-row gap-4">
                         <div className="relative flex-grow">
                             <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                             <input type="text" placeholder={content.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 p-3 bg-white border border-bg-subtle rounded-lg shadow-sm" />
                         </div>
                         <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full sm:w-auto ${showFavorites ? 'bg-accent text-white' : 'bg-white shadow-sm border'}`}>
                             <FiHeart /> {content.favoritesButton}
                         </button>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                         {filtrelenmisUrunler.map(urun => (
                             <ProduktKarte key={urun.id} urun={urun} onSepeteEkle={urunEkle} locale={locale} dictionary={dictionary} />
                         ))}
                     </div>
                     {filtrelenmisUrunler.length === 0 && <p className="text-center py-12 text-gray-500">{content.noProductsFound}</p>}
                 </div>
                 <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg sticky top-24">
                     <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2 mb-4"><FiShoppingCart /> {content.cartTitle}</h2>
                     <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 divide-y divide-bg-subtle">
                         {sepet.length === 0 ? <p className="text-gray-500 text-center py-4">{content.cartEmpty}</p> : sepet.map(item => (
                             <div key={item.urun.id} className="flex justify-between items-center pt-4 first:pt-0">
                                 <div className='flex-grow pr-2'>
                                     <p className="font-bold text-primary text-sm line-clamp-1">{(item.urun.ad as any)?.[locale]}</p>
                                     <p className="text-xs text-gray-500">{formatFiyat(item.indirimliFiyat)} x {item.adet}</p>
                                 </div>
                                 <div className="flex items-center gap-2 flex-shrink-0">
                                     <input type="number" value={item.adet} onChange={e => adetGuncelle(item.urun.id, parseInt(e.target.value))} className="w-16 p-1 text-center border rounded-md" min="0" max={item.urun.stok_miktari}/>
                                     <button onClick={() => setSepet(prev => prev.filter(p => p.urun.id !== item.urun.id))} className="p-1 text-red-500 hover:text-red-700"><FiTrash2 /></button>
                                 </div>
                             </div>
                         ))}
                     </div>
                     {sepet.length > 0 && (
                         <div className="mt-6 pt-6 border-t border-bg-subtle">
                             {indirimOrani > 0 && <p className="text-sm font-semibold text-green-600">{content.cartDiscountApplied.replace('%{discount}', indirimOrani.toString())}</p>}
                             <div className="flex justify-between items-center text-xl font-bold text-primary mt-2">
                                 <span>{content.cartTotal}</span>
                                 <span>{formatFiyat(toplamTutar)}</span>
                             </div>
                             <button onClick={handleSiparisOnayla} disabled={isPending} className="w-full mt-4 p-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400 transition-all">
                                 {isPending ? content.processingOrder : content.confirmOrderButton}
                             </button>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
}