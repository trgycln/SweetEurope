'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { FiShoppingCart, FiSearch, FiPlus, FiMinus, FiLoader } from 'react-icons/fi';
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';

type HizliSiparisUrun = {
    id: string; 
    ad: any;
    stok_kodu: string | null;
    ana_resim_url: string | null;
    fiyat: number;
    stok_miktari: number;
};

interface HizliSiparisClientProps {
    urunler: HizliSiparisUrun[];
    locale: Locale;
    dictionary: Dictionary;
}

export function HizliSiparisClient({ urunler, locale, dictionary }: HizliSiparisClientProps) {
    const router = useRouter();
    const [adetler, setAdetler] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const content = (dictionary as any)?.portal?.dashboard?.quickOrder || {};

    const handleAdetChange = (urunId: string, mevcutAdet: number, stok: number, artis: number) => {
        const yeniAdet = (mevcutAdet || 0) + artis;
        
        if (yeniAdet < 0) return;
        
        if (yeniAdet > stok) {
            toast.warning(`Stok yetersiz! Maksimum ${stok} adet ekleyebilirsiniz.`);
            setAdetler(prev => ({ ...prev, [urunId]: stok }));
            return;
        }
        setAdetler(prev => ({ ...prev, [urunId]: yeniAdet }));
    };

    const handleSepeteEkle = () => {
        setIsSubmitting(true);
        const sepeteEklenecekler = Object.entries(adetler).filter(([_, adet]) => adet > 0);

        if (sepeteEklenecekler.length === 0) {
            toast.error('Lütfen en az bir ürün için adet girin.');
            setIsSubmitting(false);
            return;
        }
        
        const params = new URLSearchParams();
        sepeteEklenecekler.forEach(([urunId, adet]) => {
            params.append(`urun_${urunId}`, adet.toString());
        });

        // Yönlendirme işlemi asenkron olmasa da, kullanıcıya anında geri bildirim vermek için
        // küçük bir gecikme eklemek UX açısından daha iyi olabilir.
        setTimeout(() => {
            router.push(`/${locale}/portal/siparisler/yeni?${params.toString()}`);
        }, 300); // 300ms sonra yönlendir.
    };

    const filtrelenmisUrunler = useMemo(() => urunler.filter(urun => {
        const ad = (urun.ad as any)?.[locale]?.toLowerCase() || '';
        const stokKodu = urun.stok_kodu?.toLowerCase() || '';
        return ad.includes(searchTerm.toLowerCase()) || stokKodu.includes(searchTerm.toLowerCase());
    }), [urunler, searchTerm, locale]);

    const seciliUrunSayisi = Object.values(adetler).filter(adet => adet > 0).length;
    
    if (urunler.length === 0) {
        return null; // Eğer hiç favori/hızlı sipariş ürünü yoksa bu bileşeni hiç gösterme.
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <h3 className="font-serif text-xl font-bold text-primary">Hızlı Sipariş</h3>
                <div className="relative flex-grow sm:flex-grow-0 sm:w-72">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Ürün adı veya kodu ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-lg focus:ring-accent focus:border-accent"
                    />
                </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto pr-2 divide-y divide-bg-subtle border-t border-b">
                {filtrelenmisUrunler.length > 0 ? filtrelenmisUrunler.map((urun) => (
                    <div key={urun.id} className="flex items-center gap-4 py-3">
                        <Image
                            src={urun.ana_resim_url || '/placeholder.png'}
                            alt={(urun.ad as any)?.[locale] || 'Ürün'}
                            width={48}
                            height={48}
                            className="rounded-md object-cover h-12 w-12 flex-shrink-0 bg-secondary"
                        />
                        <div className="flex-grow">
                            <p className="text-sm font-semibold text-text-main line-clamp-1">
                                {(urun.ad as any)?.[locale] || 'İsimsiz Ürün'}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{urun.stok_kodu}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleAdetChange(urun.id, adetler[urun.id], urun.stok_miktari, -1)} className="p-1.5 border rounded-md hover:bg-bg-subtle disabled:opacity-50" disabled={!adetler[urun.id] || adetler[urun.id] <= 0}>
                                <FiMinus size={14} />
                            </button>
                            <input
                                type="number"
                                value={adetler[urun.id] || ''}
                                onChange={(e) => handleAdetChange(urun.id, 0, urun.stok_miktari, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                min="0"
                                max={urun.stok_miktari}
                                className="w-16 text-center border rounded-md p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={urun.stok_miktari <= 0}
                            />
                            <button onClick={() => handleAdetChange(urun.id, adetler[urun.id], urun.stok_miktari, 1)} className="p-1.5 border rounded-md hover:bg-bg-subtle disabled:opacity-50" disabled={urun.stok_miktari <= 0}>
                                <FiPlus size={14} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-gray-500">Aramanıza uygun ürün bulunamadı.</div>
                )}
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSepeteEkle}
                    disabled={isSubmitting}
                    className="bg-accent text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-opacity-90 transition-all inline-flex items-center gap-2 disabled:bg-accent/50 disabled:cursor-wait"
                >
                    {isSubmitting ? <FiLoader className="animate-spin" /> : <FiShoppingCart />}
                    {seciliUrunSayisi > 0 ? `${seciliUrunSayisi} Ürünü Sepete Ekle` : 'Seçilenleri Sepete Ekle'}
                </button>
            </div>
        </div>
    );
}

