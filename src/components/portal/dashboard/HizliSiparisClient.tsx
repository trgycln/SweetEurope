'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { FiShoppingCart } from 'react-icons/fi';
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';

type HizliSiparisUrun = {
    // DEĞİŞİKLİK: 'urun_id' yerine 'id'
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
    const content = (dictionary as any)?.portal?.dashboard?.quickOrder || {};

    const handleAdetChange = (urunId: string, adet: number, stok: number) => {
        const yeniAdet = Math.max(0, adet);
        if (yeniAdet > stok) {
            toast.warning((content.stockWarning || 'Stok yetersiz! Maksimum %{stock} adet.').replace('%{stock}', stok.toString()));
            setAdetler(prev => ({ ...prev, [urunId]: stok }));
            return;
        }
        setAdetler(prev => ({ ...prev, [urunId]: yeniAdet }));
    };

    const handleSepeteEkle = () => {
        const sepeteEklenecekler = Object.entries(adetler)
            .filter(([_, adet]) => adet > 0);

        if (sepeteEklenecekler.length === 0) {
            toast.error(content.noItemsError || 'Lütfen en az bir ürün için adet girin.');
            return;
        }
        
        const params = new URLSearchParams();
        sepeteEklenecekler.forEach(([urunId, adet]) => {
            params.append(`urun_${urunId}`, adet.toString());
        });

        router.push(`/${locale}/portal/siparisler/yeni?${params.toString()}`);
    };
    
    if (urunler.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-serif text-xl font-bold text-primary mb-4">{content.title || 'Hızlı Sipariş'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {urunler.map((urun) => (
                    // DEĞİŞİKLİK: 'urun.urun_id' yerine 'urun.id'
                    <div key={urun.id} className="border p-3 rounded-lg flex flex-col items-center text-center">
                        <Image
                            src={urun.ana_resim_url || '/placeholder.png'}
                            alt={(urun.ad as any)?.[locale] || 'Ürün'}
                            width={80}
                            height={80}
                            className="rounded-md object-cover h-20 w-20 mb-2"
                        />
                        <p className="text-xs font-semibold text-text-main leading-tight h-8 line-clamp-2">
                            {(urun.ad as any)?.[locale] || 'İsimsiz Ürün'}
                        </p>
                        <input
                            type="number"
                            // DEĞİŞİKLİK: 'urun.urun_id' yerine 'urun.id'
                            value={adetler[urun.id] || ''}
                            onChange={(e) => handleAdetChange(urun.id, parseInt(e.target.value) || 0, urun.stok_miktari)}
                            placeholder="0"
                            min="0"
                            max={urun.stok_miktari}
                            className="w-full mt-2 text-center border rounded-md p-1"
                            disabled={urun.stok_miktari <= 0}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-6 text-right">
                <button
                    onClick={handleSepeteEkle}
                    className="bg-accent text-white font-bold py-2 px-6 rounded-lg shadow hover:bg-opacity-90 transition-all inline-flex items-center gap-2"
                >
                    <FiShoppingCart />
                    {content.addToCartButton || 'Seçilenleri Sepete Ekle'}
                </button>
            </div>
        </div>
    );
}