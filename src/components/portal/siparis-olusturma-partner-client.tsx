'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiPlus, FiTrash2, FiShoppingCart, FiSearch, FiAlertCircle, FiHeart } from 'react-icons/fi';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';
import Image from 'next/image';

type Urun = Tables<'urunler'>;
type Firma = Tables<'firmalar'> & { firmalar_finansal: Tables<'firmalar_finansal'>[] | null };
type SepetItem = { urun: Urun; adet: number; indirimliFiyat: number };

function ProduktKarte({ urun, onSepeteEkle }: { urun: Urun, onSepeteEkle: (urun: Urun) => void }) {
    const getStockStatus = () => {
        if (urun.stok_adeti <= urun.stok_bitti_esigi) return { text: 'Tükendi', color: 'text-red-500' };
        if (urun.stok_adeti <= urun.stok_azaldi_esigi) return { text: 'Stok Azaldı', color: 'text-yellow-500' };
        return { text: 'Stokta', color: 'text-green-500' };
    };
    const status = getStockStatus();
    const isOutOfStock = urun.stok_adeti <= urun.stok_bitti_esigi;

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col group">
            <div className="relative w-full h-48">
                <Image 
                    src={urun.fotograf_url_listesi?.[0] || '/placeholder.png'} 
                    alt={urun.urun_adi} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="font-serif font-bold text-primary flex-grow">{urun.urun_adi}</h3>
                <p className="text-sm text-gray-500">{urun.urun_kodu}</p>
                <div className="flex justify-between items-center mt-4">
                    <p className={`text-xs font-bold ${status.color}`}>{status.text}</p>
                    <button 
                        onClick={() => onSepeteEkle(urun)} 
                        disabled={isOutOfStock}
                        className="p-2 bg-accent text-white rounded-full hover:bg-opacity-80 transition-opacity disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <FiPlus />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SiparisOlusturmaPartnerClient({ firma, urunler, favoritenIds }: { firma: Firma; urunler: Urun[]; favoritenIds: Set<string> }) {
    const [sepet, setSepet] = useState<SepetItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [showFavorites, setShowFavorites] = useState(false);

    const indirimOrani = firma.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0;
    const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);

    useEffect(() => {
        const reorderData = sessionStorage.getItem('reorderCart');
        if (reorderData) {
            try {
                const itemsToReorder: { urun_id: string; adet: number }[] = JSON.parse(reorderData);
                const newCart: SepetItem[] = [];
                itemsToReorder.forEach(item => {
                    const urun = urunler.find(u => u.id === item.urun_id);
                    if (urun && item.adet > 0 && item.adet <= urun.stok_adeti) {
                        const indirimliFiyat = urun.temel_satis_fiyati * (1 - indirimOrani / 100);
                        newCart.push({ urun, adet: item.adet, indirimliFiyat });
                    }
                });
                setSepet(newCart);
            } catch (e) {
                console.error("Reorder data parsing error:", e);
            } finally {
                sessionStorage.removeItem('reorderCart');
            }
        }
    }, [urunler, indirimOrani]);

    const urunEkle = (urun: Urun) => {
        setSepet(prev => {
            const mevcutUrun = prev.find(item => item.urun.id === urun.id);
            if (mevcutUrun) {
                const yeniAdet = mevcutUrun.adet + 1;
                if (yeniAdet > urun.stok_adeti) {
                    alert(`Stokta yeterli ürün yok! Maksimum ${urun.stok_adeti} adet ekleyebilirsiniz.`);
                    return prev;
                }
                return prev.map(item => item.urun.id === urun.id ? { ...item, adet: yeniAdet } : item);
            } else {
                if (1 > urun.stok_adeti) {
                    alert("Bu ürün stokta tükenmiştir.");
                    return prev;
                }
                const indirimliFiyat = urun.temel_satis_fiyati * (1 - indirimOrani / 100);
                return [...prev, { urun, adet: 1, indirimliFiyat }];
            }
        });
    };

    const sepettenCikar = (urunId: string) => {
        setSepet(prev => prev.filter(item => item.urun.id !== urunId));
    };

    const adetGuncelle = (urunId: string, yeniAdet: number) => {
        if (yeniAdet <= 0) {
            sepettenCikar(urunId);
            return;
        }
        const urun = urunler.find(u => u.id === urunId);
        if (urun && yeniAdet > urun.stok_adeti) {
            alert(`Stokta yeterli ürün yok! Maksimum ${urun.stok_adeti} adet ekleyebilirsiniz.`);
            setSepet(prev => prev.map(item => item.urun.id === urunId ? { ...item, adet: urun.stok_adeti } : item));
            return;
        }
        setSepet(prev => prev.map(item => item.urun.id === urunId ? { ...item, adet: yeniAdet } : item));
    };
    
    const filtrelenmisUrunler = useMemo(() => {
        return urunler.filter(u => {
            const passtZuSuche = u.urun_adi.toLowerCase().includes(searchTerm.toLowerCase()) || u.urun_kodu.toLowerCase().includes(searchTerm.toLowerCase());
            const passtZuFavoriten = !showFavorites || favoritenIds.has(u.id);
            return passtZuSuche && passtZuFavoriten;
        });
    }, [searchTerm, urunler, showFavorites, favoritenIds]);

    const toplamTutar = useMemo(() => sepet.reduce((acc, item) => acc + (item.indirimliFiyat * item.adet), 0), [sepet]);
    
    const handleSiparisOnayla = () => {
        if (sepet.length === 0) {
            setError("Lütfen sipariş vermek için önce sepetinize ürün ekleyin.");
            return;
        }
        setError(null);
        startTransition(async () => {
            const itemsToSubmit = sepet.map(item => ({
                urun_id: item.urun.id, adet: item.adet, o_anki_satis_fiyati: item.indirimliFiyat
            }));
            const result = await siparisOlusturAction({
                firmaId: firma.id,
                teslimatAdresi: firma.adres || 'Adres belirtilmemiş',
                items: itemsToSubmit,
                kaynak: 'Müşteri Portalı'
            });
            if (result?.error) {
                setError(result.error);
            }
        });
    };

    return (
        <div className="space-y-8">
             <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Yeni Sipariş Oluştur</h1>
                <p className="text-text-main/80 mt-1">Katalogdan ürünleri seçerek sepetinizi oluşturun.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Ürün adı veya kodu ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 p-3 bg-white border border-bg-subtle rounded-lg shadow-sm" />
                        </div>
                        <button onClick={() => setShowFavorites(!showFavorites)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full sm:w-auto ${showFavorites ? 'bg-accent text-white' : 'bg-white shadow-sm'}`}>
                            <FiHeart /> Favorilerim
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtrelenmisUrunler.map(urun => (
                            <ProduktKarte key={urun.id} urun={urun} onSepeteEkle={urunEkle} />
                        ))}
                    </div>
                    {filtrelenmisUrunler.length === 0 && <p className="text-center py-12 text-gray-500">Bu kriterlere uygun ürün bulunamadı.</p>}
                </div>

                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg sticky top-24">
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2 mb-4"><FiShoppingCart /> Sepetiniz</h2>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2 divide-y divide-bg-subtle">
                        {sepet.length === 0 ? <p className="text-gray-500 text-center py-4">Sepetiniz boş.</p> : sepet.map(item => (
                            <div key={item.urun.id} className="flex justify-between items-center pt-4 first:pt-0">
                                <div className='flex-grow pr-2'>
                                    <p className="font-bold text-primary text-sm line-clamp-1">{item.urun.urun_adi}</p>
                                    <p className="text-xs text-gray-500">{formatFiyat(item.indirimliFiyat)} x {item.adet}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <input type="number" value={item.adet} onChange={e => adetGuncelle(item.urun.id, parseInt(e.target.value))} className="w-16 p-1 text-center border rounded-md" min="0" max={item.urun.stok_adeti}/>
                                    <button onClick={() => sepettenCikar(item.urun.id)} className="p-1 text-red-500 hover:text-red-700"><FiTrash2 /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {sepet.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-bg-subtle">
                            {indirimOrani > 0 && <p className="text-sm font-semibold text-green-600">Size özel %{indirimOrani} indirim uygulandı.</p>}
                            <div className="flex justify-between items-center text-xl font-bold text-primary mt-2">
                                <span>Toplam:</span>
                                <span>{formatFiyat(toplamTutar)}</span>
                            </div>
                            {error && <p className="text-sm text-red-500 mt-2 flex items-center gap-2"><FiAlertCircle /> {error}</p>}
                            <button onClick={handleSiparisOnayla} disabled={isPending} className="w-full mt-4 p-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400 transition-all">
                                {isPending ? 'Siparişiniz İşleniyor...' : 'Siparişi Onayla'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}