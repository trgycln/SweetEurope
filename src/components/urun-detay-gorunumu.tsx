'use client';

import React from 'react'; // DÜZELTME: 'from' kelimesi eklendi.
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { FaCookieBite, FaWeightHanging, FaBoxOpen, FaSnowflake, FaCalendarAlt, FaClock, FaInfoCircle } from 'react-icons/fa';

// Tipleri daha net tanımlıyoruz
type Urun = Tables<'urunler'> & { kategoriler: Pick<Tables<'kategoriler'>, 'ad'> | null };
type Lang = 'de' | 'tr' | 'en' | 'ar';

// Teknik özelliklerin ikon ve etiketlerini tanımlayan yapı
const ozelliklerMap = [
    { key: 'dilim_sayisi', label: 'Portionen', icon: <FaCookieBite className="text-accent"/>, suffix: '' },
    { key: 'agirlik_gr', label: 'Gewicht', icon: <FaWeightHanging className="text-accent"/>, suffix: ' gr' },
    { key: 'porsiyon_boyutu_gr', label: 'Portionsgröße', icon: <FaBoxOpen className="text-accent"/>, suffix: ' gr' },
    { key: 'saklama_kosullari', label: 'Lagerung', icon: <FaSnowflake className="text-accent"/>, suffix: '' },
    { key: 'saklama_suresi_ay', label: 'Haltbarkeit (tiefgekühlt)', icon: <FaCalendarAlt className="text-accent"/>, suffix: ' Monate' },
    { key: 'cozunme_suresi_dk', label: 'Auftauzeit', icon: <FaClock className="text-accent"/>, suffix: ' min' },
    { key: 'raf_omru_gun', label: 'Haltbarkeit (aufgetaut)', icon: <FaClock className="text-accent"/>, suffix: ' Tage' },
    // Gelecekte kahve için eklenebilecek bir örnek:
    { key: 'mensei', label: 'Herkunft', icon: <FaInfoCircle className="text-accent"/>, suffix: '' },
];

export function UrunDetayGorunumu({ urun, lang }: { urun: Urun, lang: Lang }) {
    const urunAdi = getLocalizedName(urun.urun_adi, lang);
    const aciklama = getLocalizedName(urun.aciklama, lang);
    const kategoriAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, lang) : '';
    
    // JSONB verisinden gelen ve haritamızda tanımlı olan özellikleri filtreleyip gösterime hazırlıyoruz
    const gosterilecekOzellikler = urun.teknik_ozellikler 
        ? ozelliklerMap
            .filter(item => (urun.teknik_ozellikler as any)[item.key] !== null && (urun.teknik_ozellikler as any)[item.key] !== undefined)
            .map(item => ({...item, value: (urun.teknik_ozellikler as any)[item.key]}))
        : [];

    return (
        <div className="bg-secondary py-12 md:py-20">
            <div className="container mx-auto px-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
                    {/* Resim Galerisi */}
                    <div>
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4">
                           {(urun.fotograf_url_listesi && urun.fotograf_url_listesi.length > 0) ? (
                             <Image 
                                src={urun.fotograf_url_listesi[0]} 
                                alt={urunAdi} 
                                layout="fill" 
                                objectFit="cover" 
                                priority 
                                className="transition-transform duration-500 hover:scale-105"
                             />
                           ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500">Görsel Yok</span>
                            </div>
                           )}
                        </div>
                        {/* Küçük galeri resimleri buraya eklenebilir */}
                    </div>

                    {/* Ürün Detayları */}
                    <div className="flex flex-col">
                        <p className="font-sans text-sm text-gray-500 mb-2 uppercase tracking-wider">{kategoriAdi}</p>
                        <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4">{urunAdi}</h1>
                        <p className="font-serif text-3xl text-accent mb-6">{formatCurrency(urun.temel_satis_fiyati, 'EUR')}</p>
                        
                        <div className="font-sans text-text-main leading-relaxed mb-8 prose">
                            <p>{aciklama}</p>
                        </div>

                        {gosterilecekOzellikler.length > 0 && (
                             <div className="border-t border-gray-300 pt-6">
                                <h3 className="font-bold font-sans tracking-wider uppercase mb-2 text-primary">Details</h3>
                                <div className="space-y-2">
                                    {gosterilecekOzellikler.map(item => (
                                         <div key={item.key} className="flex justify-between items-center py-3 border-b border-gray-200">
                                             <div className="flex items-center gap-3">
                                                 {item.icon}
                                                 <span className="font-medium text-text-main">{item.label}</span>
                                             </div>
                                             <span className="font-semibold text-primary">
                                                 {item.value}{item.suffix || ''}
                                             </span>
                                         </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}