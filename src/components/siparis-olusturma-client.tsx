'use client';
import { useState, useMemo, useTransition } from 'react';
import { Database, Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiArrowLeft, FiPlus, FiTrash2, FiShoppingCart, FiSearch, FiAlertCircle } from 'react-icons/fi';
import { siparisOlusturAction } from '@/app/actions/siparis-actions';

type Urun = Tables<'urunler'>;
type Firma = Tables<'firmalar'> & { firmalar_finansal: Tables<'firmalar_finansal'>[] | null };
type SepetItem = { urun: Urun; adet: number; indirimliFiyat: number };

export function SiparisOlusturmaClient({ firma, urunler }: { firma: Firma; urunler: Urun[] }) {
    const [sepet, setSepet] = useState<SepetItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [teslimatAdresi, setTeslimatAdresi] = useState(firma.adres || '');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const indirimOrani = firma.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0;

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
        const urunStok = urunler.find(u => u.id === urunId)?.stok_adeti ?? 0;
        if (yeniAdet > urunStok) {
            alert(`Stokta yeterli ürün yok! Maksimum ${urunStok} adet ekleyebilirsiniz.`);
            return;
        }
        setSepet(prev => prev.map(item => item.urun.id === urunId ? { ...item, adet: yeniAdet } : item));
    };

    const filtrelenmisUrunler = useMemo(() => {
        if (!searchTerm) return urunler;
        return urunler.filter(u => 
            u.urun_adi.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.urun_kodu.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, urunler]);

    const toplamTutar = useMemo(() => sepet.reduce((acc, item) => acc + (item.indirimliFiyat * item.adet), 0), [sepet]);
    
    const handleSiparisOnayla = () => {
        setError(null);
        startTransition(async () => {
            const itemsToSubmit = sepet.map(item => ({
                urun_id: item.urun.id,
                adet: item.adet,
                o_anki_satis_fiyati: item.indirimliFiyat
            }));
            const result = await siparisOlusturAction(firma.id, teslimatAdresi, itemsToSubmit);
            if (result?.error) {
                setError(result.error);
            }
        });
    };

    const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);

    return (
        <div className="space-y-8">
            <header>
                 <Link href={`/admin/crm/firmalar/${firma.id}`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft /> {firma.unvan} Detay Sayfasına Geri Dön
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">Yeni Sipariş Oluştur</h1>
                <p className="text-text-main/80 mt-1"><span className="font-bold">{firma.unvan}</span> için sipariş hazırlanıyor.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">Ürün Kataloğu</h2>
                    <div className="relative mb-4">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Ürün adı veya kodu ile ara..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 p-3 bg-secondary border border-bg-subtle rounded-lg"
                        />
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                        {filtrelenmisUrunler.map(urun => (
                            <div key={urun.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-bg-subtle">
                                <div>
                                    <p className="font-bold text-primary">{urun.urun_adi}</p>
                                    <p className="text-sm text-gray-500">{urun.urun_kodu} - Stok: {urun.stok_adeti}</p>
                                </div>
                                <button onClick={() => urunEkle(urun)} className="p-2 bg-accent text-white rounded-full hover:bg-opacity-80">
                                    <FiPlus />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg sticky top-24">
                     <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2 mb-4"><FiShoppingCart /> Sipariş Özeti</h2>
                     <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {sepet.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Sepetiniz boş.</p>
                        ) : (
                            sepet.map(item => (
                                <div key={item.urun.id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-primary">{item.urun.urun_adi}</p>
                                        <p className="text-sm text-gray-500">{formatFiyat(item.indirimliFiyat)} x {item.adet}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={item.adet}
                                            onChange={e => adetGuncelle(item.urun.id, parseInt(e.target.value))}
                                            className="w-16 p-1 text-center border rounded"
                                        />
                                        <button onClick={() => sepettenCikar(item.urun.id)} className="p-1 text-red-500 hover:text-red-700">
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {sepet.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-bg-subtle">
                             <label htmlFor="teslimat_adresi" className="block text-sm font-bold text-text-main/80 mb-2">Teslimat Adresi</label>
                            <textarea id="teslimat_adresi" value={teslimatAdresi} onChange={(e) => setTeslimatAdresi(e.target.value)} rows={2} className="w-full bg-secondary border border-bg-subtle rounded-lg p-2 text-sm" />
                            
                            {indirimOrani > 0 && <p className="text-sm text-green-600 mt-4">Bu müşteri için %{indirimOrani} indirim uygulandı.</p>}
                            <div className="flex justify-between items-center text-xl font-bold text-primary mt-2">
                                <span>Toplam:</span>
                                <span>{formatFiyat(toplamTutar)}</span>
                            </div>

                            {error && <p className="text-sm text-red-500 mt-2 flex items-center gap-2"><FiAlertCircle /> {error}</p>}

                            <button onClick={handleSiparisOnayla} disabled={isPending} className="w-full mt-4 p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                {isPending ? 'İşleniyor...' : 'Siparişi Tamamla'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}